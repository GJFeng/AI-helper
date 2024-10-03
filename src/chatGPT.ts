import http from 'http';
import path from 'path';
import fs from 'fs';
import vscode from 'vscode';
import * as Cheerio from 'cheerio';

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
  model?: string;
};

class ChatGPT implements vscode.WebviewViewProvider {
  public static readonly viewType = 'ai-helper.chatView';

  private _chatGPTAPI?: any;

  /* web view */
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
    const responseMessage = { type: 'setModel', value: this._openaiAPIInfo?.model };
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
      }
    });
    this._setModel();
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
      // proxy,
      model,
    } = this._openaiAPIInfo;
    this._setModel();
    // if (mode === "ChatGPTAPI" && apiKey) {
    if (apiKey) {
      // this._chatGPTAPI = new ChatGPTAPI({
      //   apiKey: apiKey,
      //   apiBaseUrl: apiBaseUrl,
      //   debug: false,
      //   completionParams: {
      //     model,
      //   },
      // });
    } else {
      // Handle the case where apiKey is undefined or falsy
      console.error('API key is missing or invalid.');
    }

    // this._conversation = null;
    // this._currentMessageNumber = 0;
    return this._chatGPTAPI;
  }

  public async resetConversation() {
    // if (this._workingState === 'idle') {
    //   if (this._conversation) {
    //     this._conversation = null;
    //   }
    //   this._currentMessageNumber = 0;
    //   this._task = '';
    //   this._response = '';
    //   this._view?.webview.postMessage({ type: 'setTask', value: '' });
    //   this._view?.webview.postMessage({ type: 'clearResponses', value: '' });
    //   this._view?.webview.postMessage({ type: 'setConversationId', value: '' });
    // } else {
    //   console.warn('Conversation is not in idle state. Resetting conversation is not allowed.');
    // }
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
    const indexcssUri = webview.asWebviewUri(
      (vscode.Uri as any).joinPath(this._extensionUri, 'media', 'styles', 'base.css')
    );
    const imgUri = webview.asWebviewUri((vscode.Uri as any).joinPath(this._extensionUri, 'media', 'images'));

    return $.html()
      .replace('{{tailwindUri}}', tailwindUri.toString())
      .replace('{{highlightcssUri}}', highlightcssUri.toString())
      .replace('{{jqueryuicssUri}}', jqueryuicssUri.toString())
      .replace('{{indexcssUri}}', indexcssUri.toString())
      .replace('{{scriptUri}}', scriptUri.toString())
      .replace(/{{imgUri}}/g, imgUri.toString());
  }
}
export default ChatGPT;
