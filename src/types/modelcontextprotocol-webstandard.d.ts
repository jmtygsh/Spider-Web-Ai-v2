declare module "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js" {
  export type TransportSendOptions = {
    relatedRequestId?: string | number;
    resumptionToken?: string;
    onresumptiontoken?: (token: string) => void;
  };

  export interface WebStandardStreamableHTTPServerTransportOptions {
    sessionIdGenerator?: () => string;
    onsessioninitialized?: (sessionId: string) => void | Promise<void>;
    onsessionclosed?: (sessionId: string) => void | Promise<void>;
  }

  export class WebStandardStreamableHTTPServerTransport {
    constructor(options?: WebStandardStreamableHTTPServerTransportOptions);
    onclose?: () => void;
    onerror?: (error: Error) => void;
    onmessage?: (message: unknown, extra?: unknown) => void;
    sessionId?: string;
    start(): Promise<void>;
    send(message: unknown, options?: TransportSendOptions): Promise<void>;
    handleRequest(request: Request): Promise<Response>;
    close(): Promise<void>;
  }
}
