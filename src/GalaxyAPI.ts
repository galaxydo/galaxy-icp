import { ExcalidrawElement, ExcalidrawTextElement } from "@excalidraw/excalidraw/types/element/types";
import { convertToExcalidrawElements } from "@excalidraw/excalidraw";
import { nanoid } from "nanoid";
import { NotificationProvider } from "./NotificationContext";
import { DataURL } from "@excalidraw/excalidraw/types/types";
import gitfred from 'gitfred';

// window.EditorView = EditorView;

type MacroFunction = (
  input: ExcalidrawElement,
  output: ExcalidrawElement,
) => Promise<ExcalidrawElement[] | string>;

// export class MacroRegistry {
//   registerMacro(name, fn) {
//     this.macros[name] = fn.bind(window.engine);
//   }
// }

// export class MacroEngine {
//   constructor ({ wallet, contracts, etc }) {
//     this.wallet = wallet;
//   }
// }

class GalaxyAPI {
  private macros: Record<string, MacroFunction>;
  private callbacks: Record<string, Function>;

  private galaxyContract: string;
  private galaxyMetadata: string;

  constructor() {
    window.gitfred = gitfred;

    this.macros = {};
    this.callbacks = {};
    this.log("Initialized.", "constructor");

    // Register default macros

    // todo: should read them locally or from remote repo
    this.registerMacro("js", this.defaultJsMacro);
    this.registerMacro("python", this.defaultPythonMacro);
    this.registerMacro("Deno", this.defaultDenoMacro);
    this.registerMacro("save", this.defaultSaveMacro);
    this.registerMacro("open", this.defaultOpenMacro);
    this.registerMacro("publish", this.defaultPublishMacro);
    this.registerMacro("complete", this.defaultGpt4Macro);
    this.registerMacro("prompt", this.defaultGpt4Macro);
    this.registerMacro("fetch", this.defaultFetchMacro);
    this.registerMacro("cat", this.defaultCatMacro);
    this.registerMacro("ls", this.defaultLsMacro);
    this.registerMacro("jump", this.defaultJumpMacro);
    this.registerMacro("html", this.defaultHtmlMacro);
    this.registerMacro("VisualAI", this.visualAiMacro);
    this.registerMacro("sh", this.defaultBashMacro);
    // this.registerMacro("gpt3", this.defaultGpt3Macro);
    // this.registerMacro("draw", this.defaultSdMacro);

    // TODO: load from https://github.com/galaxydo/galaxy-macros/tree/main

    this.galaxyContract = '5E1zfVZmokEX29W9xVzMYJAzvwnXWE7AVcP3d1rXzWhC4sxi';
    this.galaxyMetadata = 'https://raw.githubusercontent.com/7flash/galaxy-polkadot-contract/main/galaxy.json';

    window.webuiCallbacks = {};
    window.inputData = {};
    window.taskId = 0;

    // window.EditorView = EditorView;
  }

  registerCallback(taskId: string, fn: (denoResult: { success: boolean, data: string }) => void): void {
    this.callbacks[taskId] = fn.bind(this);
  }

  executeCallback(taskId: string, denoResult: string): void {
    if (typeof this.callbacks[taskId] == 'function') {
      this.callbacks[taskId](denoResult);
    }
  }

  registerMacro(name: string, fn: MacroFunction): void {
    this.macros[name.toLowerCase()] = fn.bind(this);
    this.log(`Macro "${name}" registered.`, "registerMacro");
  }

  getMacro(name: string): MacroFunction | undefined {
    const macro = this.macros[name.toLowerCase()];
    this.log(`Getting macro: "${name}"`, "getMacro");
    return macro;
  }

  // TODO: ai prompts chaining re-execution, and applying radix components rendering with AI b

  async executeMacro(
    name: string,
    input: ExcalidrawElement,
    output: ExcalidrawElement,
    label: string,
  ): Promise<ExcalidrawElement[]> {
    const macro = this.getMacro(name);
    this.log(`Executing macro "${name}" with input ${JSON.stringify(input)}`, "executeMacro");

    if (!macro) {
      throw new Error(`Macro with name ${name} is not registered.`);
    }

    const result = await macro(input, output, label);
    this.log(`Execution result for "${name}": ${JSON.stringify(result)}`, "executeMacro");

    return result;
  }

  private constructGptScript(model: string, key: string): string {
    // note, input and argument are magically embedded in runtime
    return `
async function ai() {
    const inputText = input.text;
    const taskText = argument;

    const { OpenAI } = await import("https://deno.land/x/openai/mod.ts");
    const openAI = new OpenAI('${key}');

    let opts = { model: '', messages: [] };
    opts.model = '${model}';
    opts.messages.push({ 'role': 'system', 'content': 'Execute given task over given input, respond with short result only, no comments.'});
    opts.messages.push({ 'role': 'user', 'content': 'Input: ' + inputText });
    opts.messages.push({ 'role': 'user', 'content': 'Task: ' + taskText });
    const completion = await openAI.createChatCompletion(opts);

    return completion.choices[0].message.content;
}
    `;
  }

  private async defaultCatMacro(input: ExcalidrawElement, output: ExcalidrawElement) {
    try {
      const bit = this.getFullTree(input, output);
      const cit = bit.join('').replace('~/Documents/', '/').replace('~/', '').replace(/\/\//g, '/');
      const rit = await fetch(`http://localhost:8080${cit}`)
        .then(it => it.text());
      // const xit = ea.getSceneElements().find(it => {
      //   const zit = input.groupIds.filter(azit => it.groupIds.includes(azit)).length;
      //   if (it.type == 'text' && zit) {
      //     return true;
      //   }
      // })
      console.log('rit length', rit.length);
      if (rit.length == 0) {
        return 'empty file';
      } else if (rit.length > 10000 && !(cit.endsWith('.ts'))) {
        return `(...${rit.length} symbols)`
      } else {
        return rit;
      }
    } catch (err) {
      console.error(err);
      return 'empty';
    }
  }


  private async defaultJumpMacro(input: ExcalidrawElement, output: ExcalidrawElement) {
    const TRANSITION_STEP_COUNT = 100;
    const TRANSITION_DELAY = 1000; //maximum time for transition between slides in milliseconds
    const FRAME_SLEEP = 1; //milliseconds
    const EDIT_ZOOMOUT = 0.7; //70% of original slide zoom, set to a value between 1 and 0
    const FADE_LEVEL = 0.15; //opacity of the slideshow controls after fade delay (value between 0 and 1)

    const getNavigationRect = ({ x1, y1, x2, y2 }) => {
      const { width, height } = ea.getAppState();
      const ratioX = width / Math.abs(x1 - x2);
      const ratioY = height / Math.abs(y1 - y2);
      let ratio = Math.min(Math.max(ratioX, ratioY), 10);

      const scaledWidth = Math.abs(x1 - x2) * ratio;
      const scaledHeight = Math.abs(y1 - y2) * ratio;

      if (scaledWidth > width || scaledHeight > height) {
        ratio = Math.min(width / Math.abs(x1 - x2), height / Math.abs(y1 - y2));
      }

      const deltaX = (width / ratio - Math.abs(x1 - x2)) / 2;
      const deltaY = (height / ratio - Math.abs(y1 - y2)) / 2;

      return {
        left: (x1 < x2 ? x1 : x2) - deltaX,
        top: (y1 < y2 ? y1 : y2) - deltaY,
        right: (x1 < x2 ? x2 : x1) + deltaX,
        bottom: (y1 < y2 ? y2 : y1) + deltaY,
        nextZoom: ratio,
      };
    };

    const sleep = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms));

    let busy = false;
    const scrollToNextRect = async ({ left, top, right, bottom, nextZoom }, steps = TRANSITION_STEP_COUNT) => {
      const startTimer = Date.now();
      let watchdog = 0;
      while (busy && watchdog++ < 15) await sleep(100);
      if (busy && watchdog >= 15) return;
      busy = true;
      ea.updateScene({ appState: { shouldCacheIgnoreZoom: true } });
      const { scrollX, scrollY, zoom } = ea.getAppState();
      const zoomStep = (zoom.value - nextZoom) / steps;
      const xStep = (left + scrollX) / steps;
      const yStep = (top + scrollY) / steps;
      let i = 1;
      while (i <= steps) {
        ea.updateScene({
          appState: {
            scrollX: scrollX - (xStep * i),
            scrollY: scrollY - (yStep * i),
            zoom: { value: zoom.value - zoomStep * i },
          }
        });
        const ellapsed = Date.now() - startTimer;
        if (ellapsed > TRANSITION_DELAY) {
          i = i < steps ? steps : steps + 1;
        } else {
          const timeProgress = ellapsed / TRANSITION_DELAY;
          i = Math.min(Math.round(steps * timeProgress), steps)
          await sleep(FRAME_SLEEP);
        }
      }
      ea.updateScene({ appState: { shouldCacheIgnoreZoom: false } });
      if (false) {
        ea.setActiveTool({ type: "laser" });
      }
      busy = false;
    }

    try {
      const nexit = getNavigationRect({
        x1: output.x,
        y1: output.y,
        x2: output.x + output.width,
        y2: output.y + output.height,
      });
      scrollToNextRect(nexit);
      return 'ok';
    } catch (err) {
      console.error(err);
      return 'empty';
    }
  }

  private async defaultPlaylistMacro(input: ExcalidrawElement, output: ExcalidrawElement): Promise<string[]> {
    // <script src="https://apis.google.com/js/api.js"></script>
    // <script>
    //   /**
    //    * Sample JavaScript code for youtube.playlists.insert
    //    * See instructions for running APIs Explorer code samples locally:
    //    * https://developers.google.com/explorer-help/code-samples#javascript
    //    */

    //   function authenticate() {
    //     return gapi.auth2.getAuthInstance()
    //         .signIn({scope: "https://www.googleapis.com/auth/youtube.force-ssl"})
    //         .then(function() { console.log("Sign-in successful"); },
    //               function(err) { console.error("Error signing in", err); });
    //   }
    //   function loadClient() {
    //     gapi.client.setApiKey("YOUR_API_KEY");
    //     return gapi.client.load("https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest")
    //         .then(function() { console.log("GAPI client loaded for API"); },
    //               function(err) { console.error("Error loading GAPI client for API", err); });
    //   }
    //   // Make sure the client is loaded and sign-in is complete before calling this method.
    //   function execute() {
    //     return gapi.client.youtube.playlists.insert({
    //       "part": [
    //         "snippet,status"
    //       ],
    //       "resource": {
    //         "snippet": {
    //           "title": "Sample playlist created via API",
    //           "description": "This is a sample playlist description.",
    //           "tags": [
    //             "sample playlist",
    //             "API call"
    //           ],
    //           "defaultLanguage": "en"
    //         },
    //         "status": {
    //           "privacyStatus": "private"
    //         }
    //       }
    //     })
    //         .then(function(response) {
    //                 // Handle the results here (response.result has the parsed body).
    //                 console.log("Response", response);
    //               },
    //               function(err) { console.error("Execute error", err); });
    //   }
    //   gapi.load("client:auth2", function() {
    //     gapi.auth2.init({client_id: "YOUR_CLIENT_ID"});
    //   });
    // </script>
    // <button onclick="authenticate().then(loadClient)">authorize and load</button>
    // <button onclick="execute()">execute</button>

  }

  private async defaultLsMacro(input: ExcalidrawElement, output: ExcalidrawElement): Promise<string[]> {
    const bit = this.getFullTree(input, output);
    // bit.pop();

    const cit = bit.join('').replace('~/Documents/', '/').replace('~/', '');

    try {
      // const dit = await this.executeDeno(`
      //   async function readDir() {
      //     const entries = await Deno.readDir('${cit}');
      //     return entries;
      //   }
      // `);

      const rit = await fetch(`http://localhost:8080${cit}`)
        .then(it => it.text()).then(text => {
          const parser = new DOMParser();
          const htmlDocument = parser.parseFromString(text, "text/html");
          const files = Array.from(htmlDocument.querySelectorAll('tr.file a')).map(it => it.href).filter(it => !it.endsWith('/')).map(xit => { const zit = xit.split('/'); return zit[zit.length - 1]; })
          const dirs = Array.from(htmlDocument.querySelectorAll('tr.file a')).map(it => it.href).filter(it => it.endsWith('/')).map(xit => { const zit = xit.split('/'); return zit[zit.length - 2]; })
          return { files, dirs };
        });

      const dit = [
        ...rit.files.map(lit => {
          return {
            name: lit,
            isFile: true,
            isDirectory: false,
          }
        }),
        ...rit.dirs.map(lit => {
          return {
            name: lit,
            isFile: false,
            isDirectory: true,
          }
        })
      ]

      let width = dit.length > 0 ? output.width / dit.length : output.width;
      let height = output.height;
      let x = output.x;
      let y = output.y;

      const egit = nanoid();

      let margin = input.fontSize ? input.fontSize * 1 : input.height * 2;

      const zit = [
      ];

      const frameId = nanoid();
      const mit =
        dit.filter(it => it.isFile);
      const groupIds = [...output.groupIds];
      if (groupIds.length == 0) {
        groupIds.push(nanoid());
      }
      for (const fit of mit) {
        const igit = nanoid();
        const kitId = nanoid();
        const litId = nanoid();
        const kit = {
          type: 'text',
          id: kitId,
          text: `${fit.name}`,
          // width,
          // height,
          groupIds: [...groupIds, igit],
          // frameId: frameId,
          x: x,
          y: output.y + output.height + margin,
          fontSize: input.fontSize,
          customData: {
            macros: {
              cat: true,
              write: true,
            },
            outputTo: litId,
            parentId: output.id,
          },
          frameId: output.frameId,
        };
        const akit = window.convertToExcalidrawElements([kit])[0];
        const lit = {
          type: 'text',
          id: litId,
          x: x,
          y: akit.y + akit.height,
          // frameId: frameId,
          groupIds: [...groupIds, igit],
          text: `${fit.isFile ? "<...file...content...here>" : "[--folder--]"}`,
          fontSize: akit.fontSize > 2 ? akit.fontSize - 1 : 2,
          frameId: output.frameId,
        }
        const alit = window.convertToExcalidrawElements([lit])[0];
        const wit = {
          id: nanoid(),
          type: 'arrow',
          x: output.x,
          y: output.y,
          width: kit.x - output.x,
          height: kit.y - output.y,
          start: {
            type: 'text',
            id: output.id,
            // gap: 1,
          },
          end: {
            type: 'text',
            id: kit.id,
            // gap: 1,
          },
          // label: {
          //   text: ``,
          // }
        };

        width = Math.max(alit.width, akit.width);
        x += width;
        x += margin;

        zit.push(kit);
        zit.push(lit);
        // zit.push(wit);
      }
      // const kit =
      // {
      //   id: frameId,
      //   type: 'frame',
      //   width: zit[zit.length - 1].x - zit[0].x,
      //   height: output.height,
      //   name: `${cit}`,
      //   x: output.x,
      //   y: output.y,
      //   // groupIds: [groupId],
      // };
      // zit.push(kit);
      const nit =
        dit.filter(it => it.isDirectory);
      // width = kit.width / nit.length;
      // height = kit.height;
      // x = kit.x;
      // margin = kit.height;
      // y = kit.y + kit.height + margin;

      // groupIds.push(egit);
      const xazit = zit.length > 0 ?
        Math.max(...zit.map(ezit => ezit.x)) : input.x;
      const weit = xazit + width - (zit[0] ? zit[0].x : input.x);
      const eweit =
        window.convertToExcalidrawElements([{
          type: 'text',
          fontSize: output.fontSize,
          text: '-',
          x: 0, y: 0,
        }])[0].width;
      const weweit = weit / eweit;
      const text = weweit > output.text.length ? '/' + '-'.repeat(weweit) : output.text;
      // const text = '/' + '-'.repeat(weweit);
      let xaweit = output.width;
      let exaweit = 0;
      const placeholder = `${text}` // output.text ?? '/-------------';
      const aheit = output.height * 4;
      for (const vit of nit) {
        const ritId = nanoid();
        const assit = nanoid();
        const qit = {
          id: nanoid(),
          type: 'text',
          text: `/${vit.name}`,
          // text: '/-------------',
          width: output.width,
          height: output.height,
          fontSize: output.fontSize,
          x: output.x + exaweit,// + weit + xaweit,
          y: output.y + aheit,
          customData: {
            macros: {
              ls: true,
            },
            outputTo: ritId,
            parentId: output.id,
          },
          groupIds: [assit],
          frameId: output.frameId,
          // groupIds: [ugit],
        };
        xaweit += qit.width;
        exaweit += qit.width;
        zit.push(qit);
        const rit = {
          ...qit,
          customData: {
            parentId: qit.id,
          },
          y: qit.y + margin,
          text: '/' + '-'.repeat(qit.text.length - 1),
          id: ritId,
          frameId: output.frameId,
          // groupIds: [assit],
        }
        zit.push(rit);
        const wit = {
          // id: nanoid(),
          type: 'arrow',
          x: output.x + weit,
          y: output.y,
          // y: kit.y + kit.height,
          width: xaweit,
          height: 10,
          start: {
            type: 'text',
            id: output.id,
            gap: 1,
          },
          // end: {
          //   type: 'text',
          //   id: qit.id,
          //   gap: 1,
          // },
          label: {
            text: `/${vit.name}`,
          }
        };
        // groupIds.push(git);
        // x += width;
        // zit.push(wit);
        // break;
      }

      zit.push({
        ...output,
        // frameId: frameId,
        groupIds,
        width: weit,
        text,
      });

      const result =
        window.convertToExcalidrawElements(zit);

      return result;
    } catch (err) {
      throw `ls macro: ${err.toString()}`;
    }
  }

  private getFullTree(it: ExcalidrawElement, out: ExcalidrawElement): string[] {
    const els = [...ea.getSceneElements()];

    let fullTree: string[] = [];

    const getIncomingArrow = (assit) =>
      assit.boundElements?.find(bit => {
        if (bit.type == 'arrow') {
          const cit = els.find(cit => cit.id == bit.id);
          if (cit && cit.endBinding.elementId == assit.id) {
            return true;
          }
        }
      });

    let xupit;
    let incomingArrow;

    incomingArrow = getIncomingArrow(it);
    if (!incomingArrow) {

      if (it?.customData?.parentId) {
        const upit = ea.getSceneElements().find(essit => essit.id == it.customData.parentId);
        if (upit) {
          if (upit?.customData?.parentId) {
            incomingArrow = {
              id: nanoid(),
            }
            els.push({
              id: incomingArrow.id,
              startBinding: {
                elementId: upit.id,
              },
              endBinding: {
                elementId: it.id,
              },
            })
          } else {
            incomingArrow = getIncomingArrow(upit);
            if (upit.text) {
              xupit = upit.text.replace(/^\/(\-)+/, '/');
            }
          }
        }
      } else {

        if (!incomingArrow) {
          for (const epit of it.groupIds) {
            const upit = els.find(kupit => kupit.groupIds.includes(epit) && (kupit.type == 'rectangle' || (kupit.type == 'text' && kupit.text.startsWith('/'))));
            if (upit) {
              incomingArrow = getIncomingArrow(upit);

              if (upit.text) {
                xupit = upit.text.replace(/^\/(\-)+/, '/');
              }
            }
          }
        }
      }

    }
    if (incomingArrow) {
      const bit = els.find(bit => bit.id == incomingArrow.id);
      const cit = els.find(cit => cit.type == 'text' && cit.id == bit.startBinding.elementId);
      if (cit) {
        const ecit = els.find(becit => becit.id == bit.endBinding.elementId);
        fullTree = [...fullTree, ...this.getFullTree(cit, ecit)];
      }
    }

    if (xupit) {
      fullTree.push(xupit);
    }

    if (it.text) {
      fullTree.push(it.text.replace(/^\/(\-)+/, '/'));
    }

    const outgoingArrow = it.boundElements?.find(bit => {
      if (bit.type == 'arrow') {
        const cit = els.find(cit => cit.id == bit.id);
        if (cit && cit.startBinding.elementId == it.id && cit.endBinding.elementId == out.id) {
          return true;
        }
      }
    });

    if (outgoingArrow) {
      const bit = els.find(bit => bit.id == outgoingArrow.id);
      if (bit && bit.type == 'arrow') {
        if (bit.boundElements) {
          const cit = bit.boundElements.find(cit => cit.type == 'text');
          if (cit) {
            const dit = els.find(dit => dit.id == cit.id);
            if (dit && dit.type == 'text') {
              fullTree.push(`${dit.text}`);
            }
          }
        } else {
          fullTree.push('/');
        }
      }
    }

    return fullTree;
  }

  private async defaultFetchMacro(input: ExcalidrawElement, output: ExcalidrawElement): Promise<string> {
    const urlTree = this.getFullTree(input, output);

    let url = urlTree.join('');

    try {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        if (url.startsWith('https://github.com')) {
          url = url.replace('https://github.com', 'https://raw.githubusercontent.com');
          if (url.includes('/tree')) {
            const branch = url.substring(url.indexOf('/tree')).split('/')[2];
            url = url.replace(`/tree/${branch}`, `/${branch}`);
          }
        }

        const response = await fetch(url);

        if (response.status == 200) {
          const text = await response.text();
          return text;
        }

        throw new Error(`not found ${url}`);
      } else if (url.startsWith('~/')) {
        const result = await this.executeDeno(`
                   async function readFile(input) {
          const text = await Deno.readTextFile('${url}');
return text;
        } 
          `) as string;
        return result;
      }
      throw new Error(`${url} is neither web link nor local root path`);
    } catch (err) {
      console.error(err);
      return url;
    }
  }


  private async drawMacro() {
    // https://github.com/zsviczian/obsidian-excalidraw-plugin/blob/master/ea-scripts/GPT-Draw-a-UI.md
  }

  private async youtubeTranscript(input: ExcalidrawElement, output, label: string): Promise<string> {
    function loadGoogleApiLibrary() {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    async function initializeClient() {
      try {
        // Load the Google API client library
        await loadGoogleApiLibrary();

        // Step 2: Initialize the Google API client library
        await gapi.client.init({
          'apiKey': 'AIzaSyBxT4EZ44TDgyv_0cM7xbQLjSX2vSSU4Wk', // Replace with your actual API key
          'clientId': '971263-nsmrbhdrkagi1na5l827ugjvh092mv75.apps.googleusercontent.com', // Replace with your actual client ID
          'scope': 'https://www.googleapis.com/auth/youtube.readonly', // Adjust scope for what you need
          'discoveryDocs': ['https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest']
        });

        // Step 3: Authenticate user (can also be triggered by a user action)
        await gapi.auth2.getAuthInstance().signIn();

        // Step 4: Make an API call after authentication
        const response = await gapi.client.youtube.channels.list({
          'part': 'snippet,contentDetails,statistics',
          'mine': 'true'
        });
        console.log(response.result);

      } catch (reason) {
        console.log('Error: ' + reason.result.error.message);
      }
    }

    // Step 5: Load the API client and auth2 library
    function loadClient() {
      gapi.load('client:auth2', initializeClient);
    }

    async function getTranscript(input) {
      function extractVideoID(url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
      }


      async function getCaptions(apiKey, videoId, languageCode = 'en') {

        try {
          // Get the list of caption tracks
          const captionsListResponse = await fetch(`https://youtube.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${apiKey}`);
          const captionsListData = await captionsListResponse.json();
          const captionTracks = captionsListData.items;

          const track = captionTracks.find((track) => track.snippet.language === languageCode);
          if (!track) {
            console.log('No caption track found for the specified language.');
            return;
          }

          const captionsResponse = await fetch(`https://youtube.googleapis.com/youtube/v3/captions/${track.id}?key=${apiKey}`, {
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/ttml+xml'
            }
          });
          const captionsData = await captionsResponse.text();
          console.log(captionsData);
        } catch (error) {
          console.error('Error fetching captions:', error);
        }
      }

      const youtubeLink = input.text;
      alert(youtubeLink);
      const apiKey = '251790971263-nsmrbhdrkagi1na5l827ugjvh092mv75.apps.googleusercontent.com';
      const videoId = extractVideoID(youtubeLink);

      if (videoId) {
        const captions = await getCaptions(apiKey, videoId);
      } else {
        console.log('Invalid YouTube URL');
      }
    }
  }

  private async visualAiMacro(input: ExcalidrawElement, output, label: string): Promise<string> {
    const model = 'gpt-4-vision-preview';
    const imageUrl = (ea.getFiles()[input.fileId]).dataURL;
    let denoScript;
    label = label.replace(/'/g, "\\'");
    //const text = input.text.replace(/'/g, "\\'");
    if (typeof label == 'string' && label.length > 0) {
      console.log('with label', label);
      denoScript = `
      async function gpt() {
        const { OpenAI } = await import("https://deno.land/x/openai@v4.16.1/mod.ts");
    const openAI = new OpenAI({ apiKey });

    let opts = { model: '', messages: [], max_tokens: 4000 };
    opts.model = '${model}';
    opts.messages.push({ 'role': 'system', 'content': 'Perform Instruction over given Input, respond with no comments, straight to the point' });
    opts.messages.push({ 'role': 'user', 'content': 'Input: ' });
    opts.messages.push({ 'role': 'user', 'content': [{type: "image_url", image_url: "${imageUrl}"},'Instruction: ${label}'] });
    console.log('create completion begin', new Date());
    const completion = await openAI.chat.completions.create(opts);
    console.log('create completion done', new Date());
    console.log(completion);
      return completion.choices[0].message.content;
    }
    `;
    } else {
      denoScript = `
      async function gpt() {
        const { OpenAI } = await import("https://deno.land/x/openai@v4.16.1/mod.ts");
    const openAI = new OpenAI({ apiKey });

    let opts = { model: '', messages: [], max_tokens: 4000 };
    opts.model = '${model}';
    opts.messages.push({ 'role': 'user', 'content': [{ "type": "image_url", "image_url": "${imageUrl}" }] });
    const completion = await openAI.chat.completions.create(opts);

    return completion.choices[0].message.content;
    }
    `;
    }
    const nit = nanoid();
    let result = await new Promise(resolve => {
      window.webuiCallbacks[nit] = resolve;
      window.webui.executeDeno(denoScript, JSON.stringify(input), nit);
    });
    result = JSON.parse(result).result;
    return result;
  }

  private async defaultGpt4Macro(input: ExcalidrawElement, output, label: string): Promise<string> {
    const model = 'gpt-4-1106-preview';
    let denoScript;
    label = label.replace(/'/g, "\\'");
    const text = input.text.replace(/'/g, "\\'");
    if (typeof label == 'string' && label.length > 0) {
      console.log('with label', label);
      denoScript = `
      async function gpt() {
        const { OpenAI } = await import("https://deno.land/x/openai@v4.16.1/mod.ts");
    const openAI = new OpenAI({ apiKey });

    let opts = { model: '', messages: [] };
    opts.model = '${model}';
    opts.messages.push({ 'role': 'system', 'content': 'Perform Instruction over given Input, respond with no comments, straight to the point' });
    opts.messages.push({ 'role': 'user', 'content': 'Input: ${text}' });
    opts.messages.push({ 'role': 'user', 'content': 'Instruction: ${label}' });
    console.log('create completion begin', new Date());
    const completion = await openAI.chat.completions.create(opts);
    console.log('create completion done', new Date());
    return completion.choices[0].message.content;
    }
    `;
    } else {
      denoScript = `
      async function gpt() {
        const { OpenAI } = await import("https://deno.land/x/openai@v4.16.1/mod.ts");
    const openAI = new OpenAI({ apiKey });

    let opts = { model: '', messages: [] };
    opts.model = '${model}';
    opts.messages.push({ 'role': 'user', 'content': '${text}' });
    const completion = await openAI.chat.completions.create(opts);

    return completion.choices[0].message.content;
    }
    `;
    }
    const nit = nanoid();
    let result = await new Promise(resolve => {
      window.webuiCallbacks[nit] = resolve;
      window.webui.executeDeno(denoScript, JSON.stringify(input), nit);
    });
    result = JSON.parse(result).result;
    return result;
  }

  private async defaultGpt3Macro(input: ExcalidrawElement, argument: string): Promise<string> {
    const gptScript = this.constructGptScript('gpt-3.5-turbo', window.OPENAI_KEY);
    const result = await this.executeDeno(
      gptScript,
      input,
      argument,
    ) as string;
    return result;
  }

  private defaultJsMacro(input: ExcalidrawElement, argument: string): string {
    this.log(`Input received: ${JSON.stringify(input)}`, "defaultJsMacro");
    try {
      if (input.type !== "text") throw "not ok";
      const macroSource = input.text;

      const parsedFunction = Function(`return ${macroSource};`)();
      const functionName = parsedFunction.name || "Anonymous";

      this.registerMacro(functionName, parsedFunction);

      return `${functionName} registered at ${new Date().toTimeString()}`;
    } catch (error) {
      this.log(`Error: ${error}`, "defaultJsMacro");
      throw new Error("Error parsing function: " + error);
    }
  }


  public defaultDenoMacro(input: ExcalidrawElement): Promise<ExcalidrawElement[]> {
    this.log(`Input received: ${JSON.stringify(input)}`, "defaultDenoMacro");
    try {
      if (input.type !== "text") throw "not ok";
      const macroSource = input.text;
      const regex = /function (\w+)\(/;
      const match = macroSource.match(regex);
      const functionName = (match && match[1]) || "AnonymousDeno";

      const wrappedFunction = async (input: ExcalidrawElement, output: ExcalidrawElement, label: string): Promise<string> => {
        try {
          const nit = nanoid();
          let result = await new Promise(resolve => {
            window.webuiCallbacks[nit] = resolve;
            window.webui.executeDeno(macroSource, JSON.stringify(input), nit, JSON.stringify(output), label);
          });
          result = JSON.parse(result).result;
          return result;
        } catch (err) {
          console.error('n25err', err);
          ea.setToast({
            message: `n25err: ${err}`
          })
        }
      };

      this.registerMacro(functionName, wrappedFunction);
      return `${functionName} registered at ${new Date().toTimeString()}`;
    } catch (error) {
      this.log(`Error: ${error}`, "defaultDenoMacro");
      throw new Error("Error parsing Deno function: " + error);
    }
  }

  private getPythonFunctionName(macroSource: string): string | null {
    const match = macroSource.match(/def (\w+)\(/);
    return match ? match[1] : null;
  }

  private augmentPythonCodeForExecution(macroSource: string): string {
    const functionName = this.getPythonFunctionName(macroSource);

    if (functionName && !macroSource.includes(`${functionName}(`)) {
      throw new Error(`The function ${functionName} is defined but not called in the macro source.`);
    }

    return functionName ? `${macroSource}\n\nprint(${functionName}())` : macroSource;
  }

  private createExecutionWrapper(macroSource: string): Function {
    const augmentedCode = this.augmentPythonCodeForExecution(macroSource);
    return new Function(`return async function(input) {
        return window.webui.call('executePython', \`${augmentedCode}\`);
    }`)();
  }

  private defaultPythonMacro(input: ExcalidrawElement): ExcalidrawElement {
    this.log(`Input received: ${JSON.stringify(input)}`, "defaultPythonMacro");

    if (input.type !== "text") {
      this.log(`Invalid input type: ${input.type}`, "defaultPythonMacro");
      throw new Error("Invalid input type for Python macro.");
    }

    const functionName = this.getPythonFunctionName(input.text);
    if (!functionName) {
      this.log(`Failed to extract function name: ${input.text}`, "defaultPythonMacro");
      throw new Error("Failed to extract function name from Python macro.");
    }

    const wrapperFunction = this.createExecutionWrapper(input.text);
    this.registerMacro(functionName, wrapperFunction);

    const text = `${functionName} defined at ${new Date().toTimeString()}`;
    return {
      type: "text",
      text: text,
      originalText: text,
    };
  }

  private async executeDeno(code: string, input?: ExcalidrawElement, argument?: string) {
    return new Promise(async (resolve, reject) => {
      const taskId = window.taskId;  // nanoid();
      window.taskId++;
      this.registerCallback(taskId, (denoResult) => {
        if (denoResult.success) {
          return resolve(denoResult.data);
        } else {
          return reject(`deno error: ${denoResult?.error}`);
        }
      });
      try {
        if (!window.webui) throw `Oops.. backend macros only allowed in Desktop mode!`;
        if (typeof input != 'object') {
          input = {};
        }
        const inputData = {
          taskId,
          code,
          input,
          argument: argument ?? '',
        };
        if (!window.inputData) {
          window.inputData = {};
        }
        window.inputData[taskId] = inputData;
        window.executeDeno(
          code,
          JSON.stringify(input),
          taskId,
        )
        // window.webui.call('executeDeno', JSON.stringify(inputData));
      } catch (err) {
        console.error(err);
        reject(err);
      }
    });
  }

  async defaultSaveMacro(input: ExcalidrawElement): Promise<ExcalidrawElement[]> {
    this.log(`Input received: ${JSON.stringify(input)}`, "defaultSaveMacro");
    return new Promise(async (resolve, reject) => {
      try {
        let sceneName = ""; // Initial name

        // Handle the save to IPFS logic
        const handleSaveToIPFS = async () => {
          try {
            if (!sceneName) throw "Scene name not provided.";

            const frameId = input.id;

            const scene = {
              elements: window.ea.getSceneElements().filter(it => it.frameId == frameId),
              // files: window.ea.getFiles(),
            }

            // const escapedSceneName = sceneName.replace(/'/g, "\\'");
            // const escapedSceneJSON = JSON.stringify(scene).replace(/'/g, "\\'");
            // console.log('escapedSceneJSON', escapedSceneJSON);

            //             const denoScript = `
            //         async function saveScene(input) {
            //           const kvBlob = await import('https://deno.land/x/kv_toolbox@0.0.4/blob.ts');
            //   const kv = await Deno.openKv();
            //   const blob = new TextEncoder().encode('${escapedSceneJSON}');
            //   await kvBlob.set(kv, ["layers", '${escapedSceneName}'], blob);
            //   await kv.close();
            //   return blob.length;
            //         }
            // `;

            const denoScript = `
async function saveScene() {
let bufferSize = await firstWindow.script('return JSON.stringify(window.ea.getSceneElements().filter(it => it.frameId == "'+input.id+'")).length.toString()');
bufferSize *= 4;
bufferSize += 4;
console.log('saveScene bufferSize', bufferSize);
const elements = await firstWindow.script('return JSON.stringify(window.ea.getSceneElements().filter(it => it.frameId == "'+input.id+'"))', { bufferSize: Number.parseInt(bufferSize) + 1 });
            const scene = {
              elements: JSON.parse(elements),
            };

  const encoder = new TextEncoder();
  let totalSize = 0;

  const fileIds = [...new Set(scene.elements.filter(function(it) { return it.type === 'image'; }).map(function(it) { return it.fileId; }))];

  for (var i = 0; i < fileIds.length; i++) {
    var fileId = fileIds[i];
            let existingOne = false;
            try {
        await Deno.stat(galaxyPath + '/' + fileId + '.png');             
        existingOne = true;
                } catch (e) {}
 
        if (existingOne && existingOne.isFile) continue;
    try {
            let bufferSize = await firstWindow.script('return window.ea.getFiles()["' + fileId + '"].dataURL.length.toString();');
            bufferSize *= 4;
            bufferSize += 4;            
                        console.log('bufferSize', bufferSize);

      var fileDataURL = await firstWindow.script('return window.ea.getFiles()["' + fileId + '"].dataURL;', { bufferSize: Number.parseInt(bufferSize) + 1 });

      var base64Index = fileDataURL.indexOf(';base64,');
        if (base64Index === -1) {
          throw new Error('Base64 data not found in data URL');
        }
      var base64Data = fileDataURL.substring(base64Index + 8);
            
                  var decodedData = decodeBase64(base64Data);
      totalSize += decodedData.byteLength;

      var fileType = fileDataURL.substring(11, base64Index);

      await Deno.writeFile(galaxyPath + '/' + fileId + '.' + fileType, decodedData);
    } catch (error) {
      console.error('Error saving image with fileId:', fileId, error);
    }
  }

  var sceneData = JSON.stringify(scene, null, 2);
  var encodedSceneData = encoder.encode(sceneData);
  totalSize += encodedSceneData.byteLength;
  await Deno.writeTextFile(galaxyPath + '/' + "${sceneName}" + '.json', sceneData);

  return totalSize;
               }
            `;

            try {

              const nit = nanoid();
              const result = await new Promise(resolve => {
                window.webuiCallbacks[nit] = resolve;
                window.webui.executeDeno(denoScript, JSON.stringify(input), nit);
              })
              const bytes = JSON.parse(result).result;
              const updatedText = `${sceneName} (${bytes} bytes)`;
              // const updatedText = `Frame ${input.id} saved as "${sceneName}" at ${new Date().toTimeString()}`;
              return resolve(updatedText);
            } catch (err) {
              console.error(err);
              return reject("Error executing saveScene. " + err?.toString());
            }

            // const denoResult = await window.webui.call('saveScene', JSON.stringify({
            //   sceneName: escapedSceneName,
            //   sceneData: escapedSceneJSON,
            // }))

          } catch (error) {
            reject(`Error during saving: ${error}`);
          }
        };

        // Show modal to get the layer (scene) name
        await window.showModal({
          title: "Save scene",
          callback: handleSaveToIPFS,
          inputField: {
            value: sceneName,
            placeholder: "Scene Name",
            onChange: (e) => sceneName = e.target.value
          }
        });
      } catch (error) {
        this.log(`Error: ${error}`, "defaultSaveMacro");
        reject(`Error in defaultSaveMacro: ${error}`);
      }
    });
  }


  private async defaultBashMacro(input: ExcalidrawTextElement): Promise<string> {
    const script = `
    const command = new Deno.Command(Deno.execPath(), {
      args: [
        "eval",
        "console.log('Hello World')",
      ],
      stdin: "piped",
      stdout: "piped",
    });
    const child = command.spawn();

    // open a file and pipe the subprocess output to it.
    child.stdout.pipeTo(
      Deno.openSync("output", { write: true, create: true }).writable,
    );

    // manually close stdin
    child.stdin.close();
    const status = await child.status;

    const s = await c.status;
    console.log(s);`;
  }

  private async defaultBashMacroDeprecated(input: ExcalidrawTextElement): Promise<string> {
    const nit = nanoid();
    const dit = await new Promise(resolve => {
      window.webuiCallbacks[nit] = resolve;
      window.webui.executeDeno(`
async function executeBash() {
    const cit = input.text;
    console.log('cit', cit);

  const messageBuffer = new TextEncoder().encode(cit);
  const hashBuffer = await crypto.subtle.digest("SHA-256", messageBuffer);
  const bit = encodeHex(hashBuffer);
  const dit = galaxyPath + '/' + bit + '.sh';

    await Deno.writeFile(dit, new TextEncoder().encode(cit));
console.log('dit', dit);
    const process = Deno.run({
      cmd: ["sh", dit],
      stdout: "piped",
      stderr: "piped",
    });

    const { code } = await process.status();
    if (code === 0) {
      const rawOutput = await process.output();
      const output = new TextDecoder().decode(rawOutput);
      console.log('output', output);
        return output;
    } else {
      const rawError = await process.stderrOutput();
      const error = new TextDecoder().decode(rawError);
      console.error('Failed to execute script:', error);
        return error;
    }

    }
        `, JSON.stringify(input), nit);
    });
    return JSON.parse(dit).result;
  }
  private async defaultHtmlMacro(input: ExcalidrawTextElement): Promise<string> {
    const fit = input.text;
    if (fit.startsWith('https://')) return fit;
    const kit = 'html';
    const nit = nanoid();
    const dit = await new Promise(resolve => {
      window.webuiCallbacks[nit] = resolve;
      window.webui.setMemoryFile(fit, kit, nit);
    });
    const pit = `${window.location.origin}/${dit}.${kit}`;
    return pit;
  }
  private async defaultPublishMacro(input: ExcalidrawElement): Promise<ExcalidrawElement[]> {
    const galaxyContractAddress = this.galaxyContract;

    return new Promise(async (resolve, reject) => {
      let layerName = '';
      const frameId = input.id;

      const handlePublishToGalaxy = async () => {
        try {
          if (!layerName) {
            throw "Layer name not provided.";
          }

          // const [error, ipfsLink] = await window.ipfs.upload(scene);

          // if (error) {
          //   this.log('ipfs error' + error, 'handlePublish');
          //   throw new Error(error);
          // }

          if (!window.contracts || !window.contracts.write) {
            throw new Error("Smart contract write function is not available.");
          }

          // const args = [layerName, ipfsLink];
          // this.log('args ' + args, 'handlePublish');

          // if (!window.galaxyMetadata) {
          //   window.galaxyMetadata = await fetch(this.galaxyMetadata)
          //     .then(it => it.json());
          // }

          // const metadata = window.galaxyMetadata;

          // this.log('metadata' + metadata, 'handlePublish');

          const key = `${window.user?.key}/${layerName}`;

          window.showModal({
            title: "Confirm Transaction",
            description: `Layer key: ${key}`,
            callback: async () => {
              const writeResult = await window.contracts.write({
                // address: galaxyContractAddress,
                // method: 'createLayer',
                args: { key, frameId },
                // metadata,
              });

              console.log('writeResult', writeResult)

              window.showModal({
                title: `galaxy://${key}`,
                description: 'Copy & Share the link above, create a new frame and press Open to download',
              })
              return resolve(`galaxy://${key}`);
            }
          });
        } catch (error) {
          this.log(`Error during publishing: ${error}`, "defaultPublishMacro");
          reject(error);
        }
      };

      const nov9 = () => {
        window.showModal({
          title: "Publish to Galaxy",
          message: "Please provide a layer name to publish to the Galaxy.",
          inputField: {
            label: "Layer Name",
            value: layerName,
            placeholder: "Enter Layer Name",
            onChange: (e) => {
              layerName = e.target.value;
            }
          },
          callback: handlePublishToGalaxy
        });
      }

      if (!window.user) {
        window.showModal({
          title: "Connect Wallet",
          description: `Click Confirm to invoke NFID`,
          callback: async () => {
            await window.connect();
            nov9();
          }
        })
      } else {
        nov9();
      }
    });
  }
  private async defaultOpenMacro(input: ExcalidrawElement): Promise<ExcalidrawElement[]> {
    this.log(`Input received: ${JSON.stringify(input)}`, "defaultOpenMacro");

    const galaxyContract = this.galaxyContract;
    const galaxyMetadata = this.galaxyMetadata;

    return new Promise(async (resolve, reject) => {
      try {
        if (input.type !== "frame") {
          throw new Error("Invalid input for defaultOpenMacro. Expected a frame.");
        }

        let link = '';

        // Function to handle opening from Galaxy Link
        const handleOpenFromGalaxyLink = async () => {
          try {
            if (!link) {
              link = input.name;
            }

            if (!link) {
              throw "Galaxy link not provided.";
            }

            this.log('! link 1 ' + link, 'open');

            let scene;

            if (link.startsWith('ipfs://') || link.startsWith('galaxy://')) {
              // Resolve galaxyLink to IPFS link
              if (link.startsWith('galaxy://')) {

                // if (!window.galaxyMetadata) {
                //   window.galaxyMetadata = await fetch(this.galaxyMetadata)
                //     .then(it => it.json());
                // }

                // const metadata = window.galaxyMetadata;

                const [user, name] = link.replace('galaxy://', '').split('/');
                const key = `${user}/${name}`;

                if (!window.user) {
                  await new Promise<void>(resolve => {
                    window.showModal({
                      title: "Connect Wallet",
                      description: `Click Confirm to invoke NFID`,
                      callback: async () => {
                        await window.connect();
                        resolve();
                      }
                    })
                  })
                }

                const result = await window.contracts.read({
                  // address: galaxyContract,
                  // method: 'resolveLink',
                  args: { key },
                  // metadata,
                  // options: {
                  //   defaultCaller: '5ERMmhn6tWtbSX6HspQcztkHbpaYKiZHfiouDBDXgSnMhxU6'
                  // }
                });
                scene = result.data;
                // link = ``
                // scene = '';
                // link = result.value.decoded.Ok
                // this.log('! link 2', link);
              }
              // scene =
              //   await window.ipfs.download(link);

              // this.log('scene ' + scene, 'remote');

            } else {
              const denoScript = `
async function openScene() {
  const sceneFilePath = galaxyPath + '/' + "${link}" + '.json';
    console.log('opening local scene.. ', sceneFilePath);
              const sceneData = await Deno.readTextFile(sceneFilePath);
    if (!sceneData) throw 'Local Scene not found';
    const sceneElements = JSON.parse(sceneData);
    let scene;
    if (sceneElements instanceof Array) {
    scene = { elements: sceneElements };            
              } else if (typeof sceneElements == 'object') {
                scene = sceneElements;
              }
    
    if (!scene) throw 'Invalid file format';

    const fileIds = [...new Set(scene.elements.filter(function(it) { return it.type === 'image'; }).map(function(it) { return it.fileId; }))];
    const imageFilesData = {};

  const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'];

    for (const fileId of fileIds) {
      let imageData = null;
      let dataURL = '';
      let fileType = '';
      let created = 0;
      let lastRetrieved = 0;
                
      for (const extension of imageExtensions) {
        const imageFilePath = galaxyPath + '/' + fileId + '.' + extension;
        console.log('imageFilePath', imageFilePath);
        try {
          imageData = await Deno.readFile(imageFilePath);
        } catch (_) {
          continue;
        }

        if (imageData) {
          fileType = extension;
          const { atime, mtime } = await Deno.stat(imageFilePath);
          created = mtime / 1;
          lastRetrieved = mtime / 1;
          dataURL = encodeBase64(imageData);
          break;
        }
      }

      if (!imageData) {
        console.error('Failed to load image for fileId:', fileId);
      } else {
              const mimeType = 'image/'+fileType;
       imageFilesData[fileId] = {
        id: fileId,
        mimeType: mimeType,
              created, lastRetrieved,
              dataURL: 'data:' + mimeType + ';base64,' + dataURL,
      };
              }

    }
    
    scene.files = imageFilesData;
              
    return scene;
}`;

              try {
                const nit = nanoid();
                scene = await new Promise(resolve => {
                  window.webuiCallbacks[nit] = resolve;
                  window.webui.executeDeno(denoScript, '{}', nit);
                });
                scene = JSON.parse(scene).result;
              } catch (err) {
                console.error(err);
                return reject("Error executing openScene. " + err?.toString());
              }
            }

            const newElementIds = Object.fromEntries(scene.elements.map(it => [it.id, nanoid()]));

            const newElements = scene.elements.map(it => {

              if (it.boundElements) {
                it.boundElements.forEach(kit => {
                  kit.id = newElementIds[kit.id];
                });
              }
              if (it.containerId) {
                it.containerId = newElementIds[it.containerId];
              }
              if (it.startBinding) {
                it.startBinding.elementId = newElementIds[it.startBinding.elementId];
              }
              if (it.endBinding) {
                it.endBinding.elementId = newElementIds[it.endBinding.elementId];
              }
              if (it.customData) {
                if (it.customData.outputTo) {
                  it.customData.outputTo = newElementIds[it.customData.outputTo];
                }
                if (it.customData.parentId) {
                  it.customData.parentId = newElementIds[it.customData.parentId];
                }
              }
              return {
                ...it,
                id: newElementIds[it.id],
              }
            });

            // Extracting the x, y coordinates from the user-defined frame
            const frameX = input.x;
            const frameY = input.y;

            // Find the bounding box of the newElements
            let minX = Math.min(...newElements.map(it => it.x));
            let minY = Math.min(...newElements.map(it => it.y));
            let maxX = Math.max(...newElements.map(it => it.x + it.width));
            let maxY = Math.max(...newElements.map(it => it.y + it.height));

            // Calculating the dimensions of the bounding box
            let elementsWidth = maxX - minX;
            let elementsHeight = maxY - minY;

            // Adjusting the frame width and height to accommodate the elements if necessary
            let frameWidth = Math.max(elementsWidth, input.width);
            let frameHeight = Math.max(elementsHeight, input.height);

            // Calculating the offsets to adjust the position of elements to the top-left of the frame
            let offsetX = frameX - minX;
            let offsetY = frameY - minY;

            // Creating new adjusted elements
            const adjustedElements = newElements.map(it => {
              return ({
                ...it,
                x: it.x + offsetX,
                y: it.y + offsetY,
              });
            });

            // Including the user-defined frame with potentially adjusted width and height
            const resultElements = [
              ...adjustedElements,
              {
                ...input,
                name: `${link}`,
                x: frameX,
                y: frameY,
                width: frameWidth,
                height: frameHeight
              }
            ];

            if (typeof scene.files == 'object') {
              // Object.entries(scene.files).forEach(async ([_, file]) => {
              //   const { arrayBuffer, mimeType } = file;
              //   file.dataURL = await this.getDataURL(arrayBuffer, mimeType);
              //   delete file.arrayBuffer;
              //   ea.addFiles([file]);
              // });
              ea.addFiles(Object.entries(scene.files).map(([_, it]) => it));
            }

            // If this is in a Promise, resolving it with resultElements
            resolve(resultElements);

            // Handle error as per your original script if necessary
          } catch (error) {
            this.log(`Error during opening: ${error}`, "defaultOpenMacro");
            reject(error); // Rejecting the promise in case of an error
          }
        };

        // If the galaxyLink is not present in the frame's customData, use the modal to get it

        await window.showModal({
          title: "Open from Galaxy",
          callback: handleOpenFromGalaxyLink,
          inputField: {
            value: link,
            placeholder: "Galaxy Link",
            onChange: (e) => link = e.target.value
          }
        });
      } catch (error) {
        this.log(`Error in defaultOpenMacro: ${error}`, "defaultOpenMacro");
        reject(error); // Rejecting the promise in case of an error
      }
    });
  }

  private async getDataURL(
    file: ArrayBuffer,
    mimeType: string,
  ): Promise<DataURL> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataURL = reader.result as DataURL;
        resolve(dataURL);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(new Blob([new Uint8Array(file)], { type: mimeType }));
    });
  };

  private log(message: string, method: string) {
    const formattedMessage = `[GalaxyAPI:: ${method}]- ${message}[${new Date().toISOString()}]`;
    console.log(formattedMessage);
  }
}

export default GalaxyAPI;
