import BrowserWebWorker from './browser_webworker';
import WebWorker from './webworker';
import { AssertionError } from '../../errors';

interface WebWorkersOptions {
    url?: string;
    count?: number;
}

export default async function(webworkerModule: BrowserWebWorker, options?: WebWorkersOptions, msg?: string): Promise<void> {
    if (!options) options = {};
    let workers = webworkerModule.all();
    let urlMsg = "";
    if (options.url) {
        urlMsg = ` with url "${options.url}"`;
    }
    workers = filterByUrl(workers, options);
    if (options.count !== undefined && options.count !== null) {
        if (workers.length !== options.count) {
            if (!msg) msg = `Expected ${options.count} webworkers running${urlMsg}, ${workers.length} found.`;
            throw new AssertionError("assert.webworkers", msg);
        }
    } else if (workers.length === 0) {
        if (!msg) msg = `Expected at least 1 webworker running${urlMsg}, 0 found.`;
        throw new AssertionError("assert.webworkers", msg);
    }
}

function filterByUrl(workers: Array<WebWorker>, options: WebWorkersOptions): Array<WebWorker> {
    if (options.url) {
        return workers.filter((w) => {
            return w.url === options.url;
        });
    } else return workers;
}
