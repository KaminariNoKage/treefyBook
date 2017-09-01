
Book Tree Maker
-----
This is designed to take a basic e-book and split it into: header, table of contents, any chapters, and any appendix

Much of the code was designed with the idea it could be expanded upon. This is an MVP and there are several further use cases to take into consideration, such as: 
* Add more configuration settings
* More flexible parsing (ie: allows files with variation in delimeters; it's very strict assumptions right now)
* Nesting chapters in volumes or books (The example Monte Cristo has volumes, which are currently ignored)
* Individual chapter analysis, such as characters who appear, over used words, word count, etc.
* Etc.

Some code may seem over generalized or avoiding simplification for given use cases because of this. Most have been commented.

### Example Usage

1. Install to your node project
```
npm install treeify-book
```
2. Include in your project

```
var treeifyBook = require('treeify-book');

// Splits book content into seperate files
// returns a promise
treeifyBook.extractBook({
	bookName: './node_modules/example/MonteCristo.txt',
	saveToPath: './example/MonteCristo/'
});

// Repackages book content into one file (assuming it exists)
// returns a promise
treeifyBook.packageBook({
	bookPath: './example/MonteCristo/',
	saveToFile: './example/MonteCristo_RECREATED.txt'
});
```

### Assumptions

Book files are *.txt and in the following format (Extracted/created accordingly)...

	Title: Book Title
	Author: Author Name

	<Rest of Header>

	------------------ Create/Fetch: HEADER.txt

	Contents
	Chapter 1. Chapter title
	<Rest of Contents>

	------------------ Create/Fetch: CONTENTS.txt

	Chapter 1. Chapter title
	<Chapter content>

	------------------ Create/Fetch: chapters/Chapter 1.txt

	<Repeat chapters as needed>

	------------------ 

	Appendix <or 'Footnotes'>
	<Rest of file>

	------------------ Create/Fetch: APPENDIX.txt

Files that don't follow this pattern may be subject to weird parsing errors. Parsing is not case sensitive and leading/trailing spaces are ignored.
