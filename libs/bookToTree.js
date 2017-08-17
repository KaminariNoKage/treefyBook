var fs = require('fs');
var mkdirp = require('mkdirp');
// General habit - Keep all strings at the top of the page with caps variable name
// These strings are related, so I put them in the same object for grouping association
var STR = {
	HEADER: 'HEADER',
	CONTENTS: 'CONTENTS',
	CHAPTER: 'CHAPTER',
	APPENDIX: 'APPENDIX'
}

module.exports = function(params){
	/***
	* Main function to extract book with specified parameters
	* @param {object} params - contains various configurations (values listed below)
	*	bookName 	{@string} 	The name of the book to extract information from
	*	saveToPath 	{@string}	The file path to save the content to
	* 
	* @return promise
	***/
	return new Promise(function(resolve, reject){

		if(!params.bookName){ 
			return reject('Book name not specified'); 
		}

		var readStream = fs.createReadStream(params.bookName);
		var masterChunk = '', linesList, content = {
			fileSavePath: params.saveToPath,
			table: {}
		};
		// Different types of pages, especially at the beginning and end
		// They require different methods of parsing
		var currentPageType = STR.HEADER, currentChapterName;

		// Read stream allows to book to be parsed in smaller chunks
		// so not dealing with massive text at the end

		readStream
		.on('data', function(chunk){
			// Convert Buffer to string
			linesList = chunk.toString('utf8').split('\r\n');
			linesList.forEach(function(line, index){
				if(!line){
					// No content on this line
					// Usually happens with paragraph break
					masterChunk += '\n';
					return;
				}

				if(currentPageType === STR.HEADER){
					if(line.toLowerCase().indexOf('contents') === 0){
						// Have the main content of the header page extracted
						// Move onto parsing the Contents
						// Not all books may have contents, but assumptions need compromise
						createPage(masterChunk, content.fileSavePath, STR.HEADER);
						masterChunk = line;
						currentPageType = STR.CONTENTS;
						return;
					} else {
						masterChunk = extractHeader(line, masterChunk, content);
					}
				}

				if(currentPageType === STR.CONTENTS) {
					if(!partOfTableContents(line.trim(), content)){
						// Reached end of table of contents
						// Create the contents page and move onto extracting chapters
						createPage(masterChunk, content.fileSavePath, STR.CONTENTS);
						masterChunk = line;
						currentChapterName = line;
						currentPageType = STR.CHAPTER;
						return;
					} else {
						masterChunk = extractContents(line, masterChunk, content);
					}
				}

				if(currentPageType === STR.CHAPTER) {
					if(lineStarts(line,'chapter')){
						// Saving the previoius chapter to a file and moving onto next
						createPage(masterChunk, content.fileSavePath + 'chapters/', chapterFileTitle(currentChapterName));
						masterChunk = line;
						currentChapterName = line;
					} else if(endOfChapters(line)){
						// No more chapters, going into extra content
						createPage(masterChunk, content.fileSavePath + 'chapters/', chapterFileTitle(currentChapterName));
						currentPageType = STR.APPENDIX;
						masterChunk = line;
						return;
					} else {
						masterChunk += line;
					}
				}

				if(currentPageType === STR.APPENDIX){
					masterChunk += line;
				}
			});
		})
		.on('end', function(){
			if(currentPageType === STR.CHAPTER){
				createPage(masterChunk, content.fileSavePath + 'chapters/', chapterFileTitle(currentChapterName));
			} else {
				createPage(masterChunk, content.fileSavePath, STR.APPENDIX);
			}
			resolve();
		})
		.on('error', reject);
	});
}

/*****************
* CHECKERS
*****************/

function partOfTableContents(line, content){
	/* 
	* Chapters appear listed twice
	* Once in the table of contents, and once at the top of their respective chapter
	* If not in contents table, then still extracting from table of contents
	* 
	* @param {string} line - The current line we're working with
	* @param {object} content - general object containing information on book
	*
	* @return {boolean} if line included in table of contents or doesn't need to be
	*/
	if(lineStarts(line,'chapter')){
		var chapterNumber = chapterFileTitle(line);
		if(content.table[chapterNumber]){
			return false;
		} else {
			// Add to the table of contents tracker
			content.table[chapterNumber] = true;
		}
	}
	return true;
}

function endOfChapters(line){
	/*
	* Checks if line marks the end of chapters
	*	@param {string} line - the line to parse
	*	@return {boolean} - if matches end of chapter markers
	*/
	// Could be other strings in the future
	// Putting it here to avoid bloating the if statement
	return lineStarts(line,'footnotes') || lineStarts(line, 'appendix');
}

function lineStarts(line, str){
	/* 
	* Checks if a line/string starts with another certain string
	* Lowercase comparrisons to avoid casing issues
	*	@param {string} - line to check
	*	@param {string} str - string for line to start with
	* 	@return {boolean} - if the line begins with the string
	*/
	return line.trim().toLowerCase().indexOf(str) === 0
}

/*****************
* STRING PARSE/EXTRACTION
*****************/

function extractHeader(line, masterChunk, content){
	/*
	* Gets book information from header page text
	* 	@param {string} line - the line to extract information from
	* 	@param {string} masterChunk - the current stored string
	*	@param {object} content - collected information about the book
	*
	*	@return {string} updated/modified masterChunk
	*/
	if(line.trim().toLowerCase().indexOf('title:' > -1)){
		// Get the title of the Book
		// Potentially for future use
		content.title = line.split(':')[1];
	} else if(line.trim().toLowerCase().indexOf('author:') > -1){
		// Get the author of the Book
		// Potentially for future use
		content.author = line.split(':')[1];
	}

	return masterChunk + line;
}

function extractContents(line, masterChunk, content){
	/*
	* Gets book information from contents page text
	* 	@param {string} line - the line to extract information from
	* 	@param {string} masterChunk - the current stored string
	*	@param {object} content - collected information about the book
	*
	*	@return {string} updated/modified masterChunk
	*/
	// Potential future use of function: 
	// Account for nesting chapters in volumes
	// WHile the example has volumes, most books don't so this isn't an "urgent" feature
	// For now, it's a basic return
	return masterChunk + line;
}

function chapterFileTitle(name){
	/*
	* Creates files with strick chapter names
	* This is to avoid long names, and general get-along with treeToBook function
	*	@param {string} name - The name of the chapter
	*
	*	@return {string} The updated chapter title string
	*/

	// Assuming chapter names are in the following order:
	// Chapter 	(first arguement, REQUIRED)
	// Number 	(second arguement, REQUIRED)
	// Title 	(third, optional)
	// Example: Chapter 1. It was the best of times
	// Want only Chapter 1
	var index = name.indexOf( ' ', name.indexOf( ' ' ) + 1 );
	return name.substr(0, index).replace(/\./g, '');

}

/*****************
* CREATE FILES & FOLDERS
*****************/

function createPage(text, savePath, pageName){
	// This is an async function, but the file creation is seperate
	// from the main stream. There won't be conflict
	mkdirp(savePath, function (err) {
	    if (err){ return console.error(err); }
	    // Replace all spaces and periods in string to avoid file conflicts
		fs.writeFile(savePath + pageName.trim().replace(/\./g,'') + '.txt', text, function(err) {
		    if(err) {
		        return console.log(err);
		    }

		    //console.log("Created: " + pageName);
		});
	});	
}