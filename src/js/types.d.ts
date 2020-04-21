declare var chrome;

declare interface Window {
	PANEL_API: IPanelAPI;
	chrome: any;
}

declare interface IDevToolAPI {
	getStatus(): Promise<boolean>;
	startCaptureLogs(options: {type: number, limit: number}, callbakc: (data: string[])=> void): Promise<boolean>;
	stopCaptureLogs(): void;
	tryConnect(): Promise<boolean>;
	getAppInfo(): Promise<any>;
	directCall(method: string, args: any[]): Promise<any>;
}

declare interface IPanelAPI {
	emit(type: string, data: any);
	init(devTool: IDevToolAPI);
	detach();
}

declare interface IAwayDebug {
	registerWriter(type:number, func): void;
	getInfo(): any;
}