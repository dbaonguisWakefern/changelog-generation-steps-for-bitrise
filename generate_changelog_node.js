const fs = require('fs');
const readline = require('readline');
const events = require('events');
const { execSync } = require('child_process');

// const BITRISE_SOURCE_DIR = __dirname; //enable this only when working on this script locally (for local development)
const BITRISE_SOURCE_DIR = process.env.BITRISE_SOURCE_DIR; // enable this when in Bitrise
const GIT_CHANGELOG_STARTING_HASH = process.env.GIT_CHANGELOG_STARTING_HASH ?? null;


const packageJsonObj = JSON.parse(fs.readFileSync(`${BITRISE_SOURCE_DIR}/package.json`, 'utf8')); 
const currentAppVersion = packageJsonObj.version;
const [ currMaj, currMin, currPatch ] = currentAppVersion.split('.');

console.log(`package.json = ${currMaj}.${currMin}.${currPatch}`);

// source: https://geshan.com.np/blog/2021/10/nodejs-read-file-line-by-line/
(async function processLineByLine() {
  try {
    
    // TODO: make the hashToStart be dynamic! it could either be passed as a parameter before bitrise build 
    // otherwise, if the parameter is not passed, then calculate 'hashToStart'
    var hashToStart = GIT_CHANGELOG_STARTING_HASH;

    if (!GIT_CHANGELOG_STARTING_HASH) {
      const myInterface = readline.createInterface({
        input: fs.createReadStream(`${BITRISE_SOURCE_DIR}/generate_changelog_temp.txt`)
      });
    
      const tagPrefix = 'refs/tags/v';
      var tagToSearch = tagPrefix;

      // OLD Logic -- get the most recent Major+Minor or Major tag prior to the current tag
      // if (Number(currMin) === 0) {
      //   tagToSearch += String((Number(currMaj)-1));
      // } else {
      //   tagToSearch += String(currMaj) + '.' + String(Number(currMin)-1);
      // }
      
      // NEW Logic-- just get the first patch of the current Maj.Min version in package.json
      tagToSearch += String(currMaj) + '.' + String(currMin) + '.0'; 

      var lineNo = 0;
      myInterface.on('line', function(line) {
        lineNo++;
  
        const tagText = line.match(/\(([^)]+)\)/)[1]; // source: https://stackoverflow.com/questions/12059284/get-text-between-two-rounded-brackets
        const tagArray = tagText.split(',')
        var tag = tagArray[0];
        tag = tag.replace('release-', '');
  
        if (!tag.toLowerCase().includes(tagPrefix)) {
          return;
        }
  
        if (tag.toLowerCase().includes(tagToSearch) && !hashToStart) {
          hashToStart = line.split(' ')[0];
          console.log('hashToStart: ', hashToStart);
        }
  
        // console.log(`Line #: ${lineNo} --->`, line); 
      });
    
      await events.once(myInterface, 'close');
      console.log('Reading file line by line -- done!');  
      
      if (!hashToStart) {
        console.error(`Commit Hash for tag: ${tagToSearch} is not found!`);
        throw new Error(`Commit Hash for tag: ${tagToSearch} is not found!`);
      } else {
        console.log(`Commit Hash for tag: ${tagToSearch} is: ${hashToStart}.`);
      }
    }

    // expose hashToStart as environment variable, enable only in Bitrise
    // comment out below, when running in local machine (during development)
    const cmd1 = `envman add --key GIT_HASH_TO_START --value ${hashToStart}`;
    const envManCmd = execSync(cmd1, {encoding: 'utf8'});
    
    // Do a git log again after the hasToStart has been determined 
    const cmd2 = `git log ${hashToStart}..HEAD --pretty=format:"[%h] %s"`;
    const commitLog = execSync(cmd2, {encoding: 'utf8'});
    
    // Write to a file
    fs.writeFile('generate_changelog_temp_2.txt', commitLog, err => {
      if (err) {
        console.error('error writing to generate_changelog_temp_2.txt');
      }
      console.log('file generate_changelog_temp_2.txt, written successfully');
    });
    
    console.log('commitLog :');
    console.log(commitLog);
  } catch (err) {
    console.error(err);
  }  
})();

















