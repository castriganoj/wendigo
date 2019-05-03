import { Worker } from 'puppeteer';

export default class WebWoker {
    public readonly worker: Worker;
    constructor(ww: Worker) {
        this.worker = ww;
    }

    public get url(): string {
        return this.worker.url();
    }
}