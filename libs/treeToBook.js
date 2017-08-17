// TREE TO BOOKS

var fs = require('fs');
var mkdirp = require('mkdirp');
// General habit - Keep all strings at the top of the page with caps variable name
// These strings are related, so I put them in the same object for grouping association
var STR = {
	HEADER: 'HEADER',
	CONTENTS: 'CONTENTS',
	CHAPTER: 'CHAPTER',
	APPENDIX: 'APPENDIX'
};




module.exports =  function(params){
	/***
	* Main function to extract book with specified parameters
	* @param {object} params - contains various configurations (values listed below)
	*	bookPath 	{@string} 	The name of the folder to extract information from
	*	saveToFile 	{@string}	The file path to save the content to
	* 
	* @return promise
	***/
	return new Promise(function(resolve, reject){
		var book = '';

		if(!params.bookPath){ return reject('Missing bookPath'); }
		if(!params.saveToFile){ return reject('Missing saveToFile'); }

		// Get the Header
		getFile(params.bookPath + STR.HEADER + '.txt')
		.then(function(headerContent){
			// Append header content to book
			book += headerContent;

			// Get the table of contents (and respective chapter names)
			// This is used to order the chapters in teh next section
			// return a promise so the next step can continue the pipe
			return extractContents(params.bookPath + STR.CONTENTS + '.txt');
		})
		.then(function(tableContents){
			// Append table of contents to book
			book += tableContents.content;

			// Get the chapters
			var chapterFetchPromises = [];
			tableContents.chapterOrder.forEach(function(chapterTitle){
				chapterFetchPromises.push(extractChapter(chapterTitle, params.bookPath + 'chapters/'));
			});

			// Continue once all files have resolved
			return Promise.all(chapterFetchPromises);
		})
		.then(function(chapterListContent){
			// Extract chapter content in order
			chapterListContent.forEach(function(chapterContent){
				book += chapterContent.content
			});

			// Get the appendix
			return getFile(params.bookPath + STR.APPENDIX + '.txt')
		})
		.then(function(appendixContent){
			// Add the appendix content
			book += appendixContent;

			// Now complete
			// Save extracted content as one file
			fs.writeFile(params.saveToFile, book, function(err) {
			    if(err) {
			        return reject(err);
			    }
			    resolve();
			});
		})
		// error catching
		.catch(function(err){
			console.log(err);
			reject(err);
		});

	});
}

/*****************
* EXTRACT CONTENT
*****************/

function extractContents(filePath){
	/*
	* Extracts table of contents and chapter titles
	*	@param {string} filePath - the location/name of the file with contents list
	*
	*	@return promise
	*		chapterOrder {@list:strings} - list of chapter titles (should be same as file name) in desired order
	*		content 	 {@string}		- the content of the contents files
	*/
	return new Promise(function(resolve, reject){
		var chapterList = [], lineList;

		getFile(filePath)
		.then(function(content){
			// Go through each line and get the chapter + title to maintain order
			// This is assumed to be the same as the file name in the chapters folder
			// A strict order is needed for the chapters
			// so randomly getting the full folder doesn't guarantee that
			lineList = content.split('\n');

			lineList.forEach(function(line, index){
				// Only lines that start with chapter (skip others)
				if(line.trim().toLowerCase().indexOf('chapter') === 0){
					chapterList.push(chapterFileTitle(line.trim()));
				}
			});

			resolve({
				chapterOrder: chapterList,
				content: content
			});
		})
		.catch(reject);
	});
}

function extractChapter(name, pathToFile){
	/*
	* Extracts table of contents and chapter titles
	*	@param {string} name - name of the chapter
	*	@param {string} pathToFile - path to the directory chapter file is in 
	*
	*	@return promise => {object}
	*		title 	{@string} - chapter name
	*		content {@string} - the content of the chapter files
	*/
	return new Promise(function(resolve, reject){
		getFile(pathToFile+name+'.txt')
		.then(function(data){
			// I return to title so not to loose track of chapter name
			// when the promise is resolved in the .all() list
			resolve({
				title: name,
				content: data
			});
		})
		.catch(reject);
	});
}

/*****************
* HELPER FUNCTIONS
*****************/

function getFile(fileName){
	/* 
	* General function wrapper to get files
	*	@param {string} fileName - relative/path to the file to extract
	*
	*	@return promise => {string}
	*/
	return new Promise(function(resolve, reject){

		if(!fileName){
			return reject('No file name specified');
		}

		fs.readFile(fileName, function(err, data){
			if(err){
				return reject(err);
			}

			// Convert to string (otherwise it prints as buffer)
			resolve(data.toString('utf8'));
		});
	});
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