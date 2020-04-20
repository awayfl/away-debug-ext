declare interface Window {
	PANEL_API: IPanelAPI
}

declare interface IDevToolAPI {
	getStatus(): Promise<boolean>;
	captureLogs(options: {type: number, limit: number}, callbakc: (data: string[])=> void): void;
	stopCapture();
}

declare interface IPanelAPI {
	emit(type: string, data: any);
	init(devTool: IDevToolAPI);
	detach();
}

declare interface IAwayDebug {
	registerWriter(type:number, func): void
}