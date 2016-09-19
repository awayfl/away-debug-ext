This a simple Chrome DevTools extension that is supposed to be used as a template for building new extensions.

**Warning:** use carefully as other doesn't really know what he's doing. This extension cannot be used to learn best practices.

## Useful resources
* [Google Chrome extensions](https://developer.chrome.com/extensions/overview)
* [Extending DevTools](https://developer.chrome.com/extensions/devtools)
* [How to debug chrome devtools panel extension?](http://stackoverflow.com/questions/27661243/how-to-debug-chrome-devtools-panel-extension)

## Lessons learned
* Don't try to be smart and inline `devtools.js` directly in `devtools.js` because it is so small. It won't work because of Content Security Policy.