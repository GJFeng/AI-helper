import http from 'http';
import path from 'path';
import fs from 'fs';
import vscode, { commands } from 'vscode';
import * as Cheerio from 'cheerio';
import { CommandType } from './command';
import OpenAI from 'openai';
import { randomUUID } from 'crypto';

type WorkingState = 'idle' | 'asking';
/** 指令 */
const _commands = Object.values(CommandType);

interface Settings {
  selectedInsideCodeblock?: boolean;
  codeblockWithLanguageId?: boolean;
  keepConversation?: boolean;
  timeoutLength?: number;
  indentOnInserting?: boolean;
}
type OpenAIAPIInfo = {
  // mode?: string,
  apiKey?: string;
  // accessToken?: string,
  // proxyUrl?: string
  apiBaseUrl?: string;
  model: string;
};

class ChatGPT implements vscode.WebviewViewProvider {
  public static readonly viewType = 'ai-helper.chatView';

  private _chatGPTAPI?: OpenAI;
  /** 对话内容 */
  private _task?: {
    /* 对话内容 */
    value: any;
    /* 命令 */
    command?: CommandType;
    /** open ai 会话流 id */
    id?: string;
    /** 会话唯一键， */
    uuid?: number | string;
  };

  // chatgpt 终止器
  private _abortController = new AbortController();

  /** 每次会话信息 */
  private _conversation?: {};

  /** 状态 */
  private _workingState: WorkingState = 'idle';

  /* 当前消息 条数，自增 */
  private _currentMessageNumber = 0;

  /** web view */
  private _view?: vscode.WebviewView;
  /** 插件配置 */
  private _settings: Settings = {
    selectedInsideCodeblock: false,
    codeblockWithLanguageId: false,
    keepConversation: true,
    timeoutLength: 60,
    indentOnInserting: true,
  };
  private _openaiAPIInfo?: OpenAIAPIInfo;

  constructor(private readonly _extensionPath: string, private readonly _extensionUri: vscode.Uri) {}
  private _setModel() {
    /* 设置 gpt model */
    const responseMessage = { type: 'setModelVersion', value: this._openaiAPIInfo?.model };
    this._view?.webview.postMessage(responseMessage);
  }
  /** 设置 open ai api */
  public setOpenAIAPIInfo(openaiapiInfo: OpenAIAPIInfo) {
    this._openaiAPIInfo = openaiapiInfo;

    this._newAPI();
  }
  /** 保存设置 */
  public setSettings(settings: Settings) {
    this._settings = { ...this._settings, ...settings };
  }
  /** 获取设置 */
  public getSettings() {
    return this._settings;
  }
  /** 设置状态 */
  private _setWorkingState(mode: WorkingState) {
    this._workingState = mode;
    this._view?.webview.postMessage({ type: 'setWorkingState', value: this._workingState });
  }
  /* 初始化 open ai */
  private _newAPI() {
    if (!this._openaiAPIInfo) {
      console.warn('Invalid OpenAI API info, please set working mode and related OpenAI API info.');
      return null;
    }

    const {
      // mode,
      apiKey,
      // accessToken,
      apiBaseUrl,
      model,
    } = this._openaiAPIInfo;
    this._setModel();
    // if (mode === "ChatGPTAPI" && apiKey) {
    if (apiKey) {
      this._chatGPTAPI = new OpenAI({
        apiKey: apiKey,
        baseURL: apiBaseUrl,
      });
    } else {
      // Handle the case where apiKey is undefined or falsy
      console.error('API key is missing or invalid.');
    }

    // this._conversation = null;
    // this._currentMessageNumber = 0;
    return this._chatGPTAPI;
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;
    console.log('data', webviewView);
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };
    /* 设置html */
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
    webviewView.webview.onDidReceiveMessage((data) => {
      console.log(data);
      switch (data.type) {
        case 'sendPrompt': {
          this.askWithContext(data.value.task, data.value.context);
          break;
        }
        case 'abort': {
          this.abort();
          break;
        }
      }
    });
    this._setModel();
  }
  public async askWithContext(task: string, context: CommandType): Promise<void> {
    this._task = {
      ...this._task,
      command: context,
      value: task,
      uuid: randomUUID(),
    };

    if (!this._chatGPTAPI) {
      this._newAPI();
    }

    // show chat view
    this._view?.show?.(!this._view);

    let searchPrompt: string;
    let languageId: string;

    console.log('vscode.window.activeTextEditor?', vscode.window.activeTextEditor, task, context);

    this._setWorkingState('asking');
    // 提问
    this._view?.webview.postMessage({
      type: 'addRequest',
      value: { text: this._task?.value, command: this._task?.command, uuid: this._task?.uuid },
    });

    if (context && [CommandType.ask, CommandType.explain, CommandType.improve, CommandType.test].includes(context)) {
      const selection = vscode.window.activeTextEditor?.selection;
      const selectedText = selection && vscode.window.activeTextEditor?.document.getText(selection);
      if (!selectedText) {
        const errorMessage = '未识别到函数，请先光标选中期望的代码片段后再次发起任务。';
        this._view?.webview.postMessage({
          type: 'addEvent',
          value: { text: errorMessage, command: this._task?.command, uuid: this._task?.uuid },
        });
        return;
      }
      languageId = this._settings.codeblockWithLanguageId
        ? vscode.window.activeTextEditor?.document?.languageId || ''
        : '';
      searchPrompt = `${task}\n${'```'}${languageId}\n${selectedText}\n${'```'}\n`;
    } else {
      searchPrompt = task;
    }
    // switch (context) {
    //   case 'selection':
    //     const selection = vscode.window.activeTextEditor?.selection;
    //     const selectedText = selection && vscode.window.activeTextEditor?.document.getText(selection);
    //     languageId = this._settings.codeblockWithLanguageId
    //       ? vscode.window.activeTextEditor?.document?.languageId || ''
    //       : '';
    //     searchPrompt = selectedText ? `${task}\n${'```'}${languageId}\n${selectedText}\n${'```'}\n` : task;
    //     break;

    // case 'whole_file':
    //   const activeDoc = vscode.window.activeTextEditor?.document;
    //   languageId = this._settings.codeblockWithLanguageId ? activeDoc?.languageId || '' : '';
    //   const fileContent = activeDoc ? activeDoc.getText() : '';
    //   searchPrompt = `${task}\n${'```'}${languageId}\n${fileContent}\n${'```'}\n`;
    //   break;
    // case 'all_opened_files':
    //   const activeTabGroup = vscode.window.tabGroups.activeTabGroup;
    //   const tabs = activeTabGroup.tabs;

    //   if (tabs.length > 0) {
    //     let mergedContent = '';
    //     const copiedFiles: string[] = [];

    //     for (const tab of tabs) {
    //       const uri = (tab.input as vscode.TabInputText).uri;
    //       if (uri && uri.scheme === 'file') {
    //         const filename = uri.fsPath;
    //         const content = await vscode.workspace.fs.readFile(uri);
    //         mergedContent += `## ${filename}\n\n\`\`\`\n${content}\n\`\`\`\n\n`;
    //         copiedFiles.push(filename);
    //       }
    //     }
    //     searchPrompt = `${task}\n${mergedContent}`;
    //   } else {
    //     searchPrompt = task;
    //   }
    //   break;
    //   default:
    //     searchPrompt = task;
    // }

    this._askChatGPT(searchPrompt);
  }
  private async _askChatGPT(searchPrompt: string): Promise<void> {
    this._view?.show?.(true);

    if (!this._chatGPTAPI) {
      const errorMessage =
        '[ERROR] API key not set or wrong, please go to extension settings to set it (read README.md for more info).';
      this._view?.webview.postMessage({
        type: 'addEvent',
        value: { text: errorMessage, command: this._task?.command, uuid: this._task?.uuid },
      });
      return;
    }

    // this._view?.webview.postMessage({
    //   type: 'setTask',
    //   value: { text: this._task?.value, command: this._task?.command, uuid: this._task?.uuid },
    // });

    this._currentMessageNumber++;

    try {
      const currentMessageNumber = this._currentMessageNumber;

      const stream = await this._chatGPTAPI.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: this._askPrompt(),
          },
          {
            role: 'user',
            content: searchPrompt,
          },
        ],
        stream: true,
        model: this._openaiAPIInfo?.model as string,
      });
      this._abortController = stream.controller;
      // 打印 stream
      let streamId: string = '0';
      let answer: string = '';
      for await (const chunk of stream) {
        const { id, choices } = chunk;
        if (this._currentMessageNumber !== currentMessageNumber) {
          return;
        }

        if (this._view?.visible) {
          answer += choices[0]?.delta?.content || '';
          const responseMessage = {
            type: 'addResponse',
            value: {
              id: id,
              uuid: this._task?.uuid,
              text: answer,
            },
          };
          this._view?.webview.postMessage(responseMessage);
        }
        streamId = id;
        console.log('response', stream, chunk, chunk.choices[0]?.delta?.content || '');
      }
      this._conversation = {
        ...this._conversation,
        // @ts-ignore
        id: streamId,
      };
      // const res = await this._chatGPTAPI.sendMessage(searchPrompt, {
      //   onProgress: (partialResponse) => {
      //     if (
      //       partialResponse.id === partialResponse.parentMessageId ||
      //       this._currentMessageNumber !== currentMessageNumber
      //     ) {
      //       return;
      //     }

      //     if (this._view?.visible) {
      //       const responseMessage = { type: 'addResponse', value: partialResponse };
      //       this._view?.webview.postMessage(responseMessage);
      //     }
      //   },
      //   timeoutMs: (this._settings.timeoutLength || 60) * 1000,
      //   abortSignal: this._abortController.signal,
      //   ...this._conversation,
      // });

      // if (this._settings.keepConversation) {
      //   this._conversation = {
      //     conversationId: res.conversationId,
      //     parentMessageId: res.id,
      //   };
      //   this._view?.webview?.postMessage({ type: 'setConversationId', value: res.conversationId });
      // }
      this._view?.webview?.postMessage({ type: 'setConversationId', value: streamId });
    } catch (e) {
      console.error(e);
      const errorMessage = `[ERROR] ${e}`;
      this._view?.show?.(true);
      this._view?.webview.postMessage({
        type: 'addEvent',
        value: { text: errorMessage, command: this._task?.command, uuid: this._task?.uuid },
      });
    }

    this._setWorkingState('idle');
  }
  /** 设置问题 提示词 */
  private _askPrompt(): string {
    const { command } = this._task || {};
    if (!command) {
      return 'Answer questions in Chinese';
    }
    switch (command) {
      case CommandType.ask:
        return '我希望你能充当代码解释者，根据所选择代码段，回答有关用户代码的问题。 [附上程序码]';
      case CommandType.explain:
        return '你现在是一个 [程序语言] 专家，请告诉我以下的程序码在做什么。 [附上程序码]';
      case CommandType.improve:
        return '你现在是一个 Clean Code 专家，我有以下的程序码，请用更干净简洁的方式改写，让我的同事们可以更容易维护程序码。另外，也解释为什么你要这样重构，让我能把重构的方式的说明加到 Pull Request 当中。 [附上程序码]';
      case CommandType.test:
        return '你现在是一个 [程序语言] 专家，我有一段程序码 [附上程序码]，请更加当前代码的语言，请帮我写一个单元测试，请至少提供五个测试案例，同时要包含到极端的状况，让我能够确定这段程序码的输出是正确的。';
      // case CommandType.image:
      // return '';
      // case CommandType.bing:
      // return ``;
      default:
        return '';
    }
  }
  /** 终止 */
  public async abort() {
    this._abortController?.abort();
    this._setWorkingState('idle');

    // this._view?.webview.postMessage({
    //   type: 'addEvent',
    //   value: { text: '[EVENT] Aborted by user.', command: this._task?.command, uuid: this._task?.uuid },
    // });

    // reset the controller
    this._abortController = new AbortController();
  }
  public async resetConversation() {
    if (this._workingState === 'idle') {
      if (this._conversation) {
        this._conversation = {};
      }
      this._currentMessageNumber = 0;
      this._task = undefined;

      this._view?.webview.postMessage({ type: 'clearing' });
      // this._view?.webview.postMessage({ type: 'clearResponses', value: '' });
      // this._view?.webview.postMessage({ type: 'setConversationId', value: '' });
    } else {
      console.warn('Conversation is not in idle state. Resetting conversation is not allowed.');
    }
  }

  /** 处理html */
  private _getHtmlForWebview(webview: vscode.Webview): string {
    const indexHtmlPath = path.join(this._extensionPath, 'media', 'html', 'index.marked.html');
    const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
    console.log(indexHtmlPath);
    const $ = Cheerio.load(indexHtml);

    $('#responses').empty();

    // Remove all <style> tags with class 'editing'
    $('head > link.editing').remove();
    $('head > script.editing').remove();

    // hide div.response_templates
    $('div#response_templates').css('display', 'none');

    // remove all elements of class editing in div#response_templates
    $('div#response_templates .editing').remove();

    const scriptUri = webview.asWebviewUri((vscode.Uri as any).joinPath(this._extensionUri, 'dist', 'main.js'));
    const tailwindUri = webview.asWebviewUri(
      (vscode.Uri as any).joinPath(this._extensionUri, 'media', 'scripts', 'tailwind.min.js')
    );
    const highlightcssUri = webview.asWebviewUri(
      (vscode.Uri as any).joinPath(this._extensionUri, 'media', 'styles', 'highlight-vscode.min.css')
    );
    const jqueryuicssUri = webview.asWebviewUri(
      (vscode.Uri as any).joinPath(this._extensionUri, 'media', 'styles', 'jquery-ui.css')
    );
    const resetcssUri = webview.asWebviewUri(
      (vscode.Uri as any).joinPath(this._extensionUri, 'media', 'styles', 'reset.css')
    );
    const indexcssUri = webview.asWebviewUri(
      (vscode.Uri as any).joinPath(this._extensionUri, 'media', 'styles', 'index.css')
    );
    const imgUri = webview.asWebviewUri((vscode.Uri as any).joinPath(this._extensionUri, 'media', 'images'));

    return $.html()
      .replace('{{tailwindUri}}', tailwindUri.toString())
      .replace('{{highlightcssUri}}', highlightcssUri.toString())
      .replace('{{jqueryuicssUri}}', jqueryuicssUri.toString())
      .replace('{{resetcssUri}}', resetcssUri.toString())
      .replace('{{indexcssUri}}', indexcssUri.toString())
      .replace('{{scriptUri}}', scriptUri.toString())
      .replace(/{{imgUri}}/g, imgUri.toString());
  }
}
export default ChatGPT;
