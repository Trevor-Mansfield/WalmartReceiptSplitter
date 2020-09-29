class ListenerManager {

	constructor() {
		this.listeners = {};
	}

	addListener = (type, listener) => {
		if (type in this.listeners) {
			this.listeners[type].push(listener);
		} else {
			this.listeners[type] = [listener];
		}
	}

	notifyListeners = (rawData) => {
		const message = JSON.parse(rawData);
		const type = message.type || "";
		if (type in this.listeners) {
			const listeners = this.listeners[type];
			for (let index = listeners.length - 1; index >= 0; --index) {
				listeners[index](message);
			}
		}
	}

	removeListener = (type, listener) => {
		if (type in this.listeners) {
			const listeners = this.listeners[type];
			for (let index = listeners.length - 1; index >= 0; --index) {
				if (listeners[index] === listener) {
					listeners.splice(index, 1);
				}
			}
			if (listeners.length === 0) {
				delete this.listeners[type];
			}
		}
	}

}

export {ListenerManager};
