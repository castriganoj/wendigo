import BrowserNavigation from './browser_navigation';
import DomElement from '../../models/dom_element';
import { TimeoutError, WendigoError } from '../../errors';
import { WendigoSelector } from '../../types';
import { createFindTextXPath, delay, isNumber } from '../../utils/utils';
import FailIfNotLoaded from '../../decorators/fail_if_not_loaded';
import OverrideError from '../../decorators/override_error';
import { EvaluateFn } from '../../puppeteer_wrapper/puppeteer_types';

export default abstract class BrowserWait extends BrowserNavigation {

    public wait(ms: number = 250): Promise<void> {
        return delay(ms);
    }

    @FailIfNotLoaded
    public async waitFor(selector: EvaluateFn, timeout?: number, ...args: Array<any>): Promise<void> {
        timeout = this._getTimeout(timeout);
        args = args.map((e) => {
            if (e instanceof DomElement) return e.element;
            else return e;
        });
        try {
            await this._page.waitFor(selector, {
                timeout: timeout,
                visible: true
            }, ...args);
        } catch (err) {
            let errMsg;
            if (typeof selector === 'function') errMsg = `Waiting for function to return true`;
            else errMsg = `Waiting for element "${selector}"`;
            throw new TimeoutError("waitFor", errMsg, timeout);
        }
    }

    @FailIfNotLoaded
    public async waitUntilNotVisible(selector: WendigoSelector, timeout?: number): Promise<void> {
        timeout = this._getTimeout(timeout);
        try {
            await this.waitFor((q: string | HTMLElement) => {
                const element = WendigoUtils.queryElement(q);
                return !WendigoUtils.isVisible(element);
            }, timeout, selector);
        } catch (err) {
            throw new TimeoutError("waitUntilNotVisible", `Waiting for element "${selector}" to not be visible`, timeout);
        }
    }

    @FailIfNotLoaded
    public async waitForUrl(url: string | RegExp, timeout?: number): Promise<void> {
        timeout = this._getTimeout(timeout);
        if (!url) return Promise.reject(new WendigoError("waitForUrl", `Invalid parameter url.`));
        let parsedUrl: string | RegExp | { source: string, flags: string } = url;
        if (url instanceof RegExp) {
            parsedUrl = {
                source: url.source,
                flags: url.flags
            };
        }
        try {
            await this.waitFor((expectedUrl: string | { source: string, flags: string }) => {
                const currentUrl = window.location.href;
                if (currentUrl === "about:blank") return false;
                if (typeof expectedUrl !== 'string') {
                    const regex = new RegExp(expectedUrl.source, expectedUrl.flags);
                    return regex.test(currentUrl);
                } else {
                    return currentUrl === expectedUrl;
                }
            }, timeout, parsedUrl);
        } catch (err) {
            throw new TimeoutError("waitForUrl", `Waiting for url "${url}"`, timeout);
        }
    }

    @FailIfNotLoaded
    public async waitForNavigation(timeout?: number): Promise<void> {
        timeout = this._getTimeout(timeout);
        const t1 = new Date().getTime();
        try {
            await this._page.waitForNavigation({
                timeout: timeout
            });
            const t2 = new Date().getTime();
            const timeDiff = t2 - t1;
            let timeout2 = timeout - timeDiff;
            if (timeout2 < 10) timeout2 = 10; // just in case
            await this.waitFor(() => {
                const w = window as any;
                return Boolean(w.WendigoUtils);
            }, timeout2);
        } catch (err) {
            throw new TimeoutError("waitForNavigation", "", timeout);
        }
    }

    @FailIfNotLoaded
    @OverrideError()
    public async clickAndWaitForNavigation(selector: WendigoSelector, timeout?: number): Promise<number> {
        timeout = this._getTimeout(timeout);
        const result = await Promise.all([
            this.waitForNavigation(timeout),
            this.click(selector)
        ]);
        return result[1];
    }

    public async waitForText(text: string, timeout?: number): Promise<void> {
        timeout = this._getTimeout(timeout);
        try {
            const xPath = createFindTextXPath(text);
            await this.waitFor((xp: string) => {
                return Boolean(WendigoUtils.xPathQuery(xp).length > 0);
            }, timeout, xPath);
        } catch (err) {
            throw new TimeoutError("waitForText", `Waiting for text "${text}"`, timeout);
        }
    }

    public async waitAndClick(selector: string, timeout?: number): Promise<number> {
        timeout = this._getTimeout(timeout);
        try {
            await this.waitFor(selector, timeout);
            return await this.click(selector);
        } catch (err) {
            throw new TimeoutError("waitAndClick", "", timeout);
        }
    }

    public async waitUntilEnabled(selector: WendigoSelector, timeout?: number): Promise<void> {
        timeout = this._getTimeout(timeout);
        try {
            await this.waitFor((q: string | HTMLElement) => {
                const element = WendigoUtils.queryElement(q);
                if (!element) return false;
                const value = element.getAttribute("disabled");
                return value === null;
            }, timeout, selector);
        } catch (err) {
            throw new TimeoutError("waitUntilEnabled", `Waiting for element "${selector}" to be enabled`, timeout);
        }
    }

    private _getTimeout(timeout?: number): number {
        if (isNumber(timeout)) return timeout;
        else return this._settings.defaultTimeout;
    }
}
