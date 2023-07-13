const fs = require('fs');
const readline = require('readline');
const events = require('events');
const { execSync } = require('child_process');

// const BITRISE_SOURCE_DIR = __dirname; //enable this only when working on this script locally
const BITRISE_SOURCE_DIR = process.env.BITRISE_SOURCE_DIR; // enable this when in Bitrise

const GIT_CHANGELOG_STARTING_HASH = process.env.GIT_CHANGELOG_STARTING_HASH ?? null;

// source: https://geshan.com.np/blog/2021/10/nodejs-read-file-line-by-line/
(async function processLineByLine() {
  try {
    
    const myInterface = readline.createInterface({
      input: fs.createReadStream(`${BITRISE_SOURCE_DIR}/generate_changelog_temp_2.txt`)
    });
    
    var commitLogMD = '';
    var commitLogHTML = '';
    var commitLogTXT = '';
    var lineNo = 0;
    var hashAndTagArray = null;
    var lastTag = null;
    var mainCommitLogMD = '';
    var mainCommitLogHTML = '';
    var mainCommitLogTXT = '';
    
    myInterface.on('line', function(line) {
      lineNo++;
  
      // sources: https://superuser.com/a/1651455 and https://forum.uipath.com/t/regex-for-3-or-more-consecutive-numbers/352753
      // will match SHOP-XXXXX or shop-XXXXX (2 digits or more)
      const jiraTicketCode = line.match(/\bshop-\b\d{2,}/gi);

      if (jiraTicketCode) {
        const jiraTicketCodeUpper = String(jiraTicketCode).toUpperCase();
        const position = line.indexOf(']') + 1;
        const newLineMD = ['* ', line.slice(0, position), ` [${jiraTicketCodeUpper}](https://wakefern.atlassian.net/browse/${jiraTicketCodeUpper})`, line.slice(position)].join('');
        const newLineHTML = ['* ', line.slice(0, position), ` <a href="https://wakefern.atlassian.net/browse/${jiraTicketCodeUpper}" target="_blank">${jiraTicketCodeUpper}</a>`, line.slice(position)].join('');
        const newLineTXT = ['* ', line.slice(0, position), ` [${jiraTicketCodeUpper}]`, line.slice(position)].join('');
        
        commitLogMD += newLineMD + '\n';
        commitLogHTML += newLineHTML + '\n';
        commitLogTXT += newLineTXT + '\n';
      } else {
        // check if this line can only be split into 2 arrays, if yes, then this is possible a line for tag label
        // ex: [81a03dd8a] 9.10.2
        hashAndTagArray = String(line).split(/\s+/);
        if (hashAndTagArray.length === 2) {
          if (!GIT_CHANGELOG_STARTING_HASH) {
            mainCommitLogMD += `### Tag: v${hashAndTagArray[1]}\n` + commitLogMD + `\n`;
            mainCommitLogHTML += `* Tag: v${hashAndTagArray[1]}\n` + commitLogHTML + `\n`;
            mainCommitLogTXT += `* Tag: v${hashAndTagArray[1]}\n` + commitLogTXT + `\n`;
          } else {
            mainCommitLogMD += commitLogMD;
            mainCommitLogHTML += commitLogHTML;
            mainCommitLogTXT += commitLogTXT;
          }
          commitLogMD = '';
          commitLogHTML = '';
          commitLogTXT = '';
          lastTag = hashAndTagArray[1];
        } 
      }
    });
    
    await events.once(myInterface, 'close');
    console.log('Reading file line by line -- done!');
    
    // as final touch, just add the last tag label at the end
    // warning, this is hard-coded for now, assuming the very first (or last) patchNumber is '0'
    if (lastTag) {
      const [majNum, minNum, patchNum] = lastTag.split('.');
      if (!GIT_CHANGELOG_STARTING_HASH) {
        mainCommitLogMD += `### Tag: v${majNum}.${minNum}.0\n` + commitLogMD;
        mainCommitLogHTML += `* Tag: v${majNum}.${minNum}.0\n` + commitLogHTML;
        mainCommitLogTXT += `* Tag: v${majNum}.${minNum}.0\n` + commitLogTXT;
      } else {
        mainCommitLogMD += commitLogMD;
        mainCommitLogHTML += commitLogHTML;
        mainCommitLogTXT += commitLogTXT;
      }
    }
    
	// Write to files
    fs.writeFile('generate_changelog_MD.md', mainCommitLogMD, err => {
      if (err) {
        console.error('error writing to generate_changelog_MD.md');
      }
      console.log('file generate_changelog_MD.md, written successfully');
    });
    
    fs.writeFile('generate_changelog_HTML.html', mainCommitLogHTML, err => {
      if (err) {
        console.error('error writing to generate_changelog_HTML.html');
      }
      console.log('file generate_changelog_HTML.html, written successfully');
    });
    
    fs.writeFile('generate_changelog_TXT.txt', mainCommitLogTXT, err => {
      if (err) {
        console.error('error writing to generate_changelog_TXT.txt');
      }
      console.log('file generate_changelog_TXT.txt, written successfully');
    });

    // expose mainCommitLogMD, mainCommitLogMD and mainCommitLogTXT as environment variables, enable only in Bitrise
    // Do this is another step in Bitrise
    // const cmd1 = `envman add --key GIT_CHANGELOG_MD --value ${mainCommitLogMD}`;
    // const cmd2 = `envman add --key GIT_CHANGELOG_HTML --value ${mainCommitLogHTML}`;
    // const cmd3 = `envman add --key GIT_CHANGELOG_TXT --value ${mainCommitLogTXT}`;    
  } catch (err) {
    console.error(err);
  }  
})();

















