import { EventEmitter } from "events";

const globalForEventBus = globalThis as typeof globalThis & {
  eventBus?: EventEmitter;
};

const eventBus = globalForEventBus.eventBus ?? new EventEmitter();

eventBus.setMaxListeners(50);

if (process.env.NODE_ENV !== "production") {
  globalForEventBus.eventBus = eventBus;
}

export default eventBus;
