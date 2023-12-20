class VirtualList {
	node;
	#max;
	#root;
	#items;
	#height;
	#timeout;
	#template;
	#scrollThrottle;
	#gap = 5;
	#count = 0;
	#offset = 3;
	#thorottleTime = 50;
	#rendered;

	constructor({ items = [], height = 50, renderHandler, gap = 5, template, root }) {
		this.#items = [...items];
		this.#height = height;
		this.#gap = gap;
		this.#count = items.length;
		this.#template = template;
		this.#root = root || window;
		this.#max = Math.ceil(window.screen.height / (height + gap));

		if (renderHandler) {
			this.renderHandler = renderHandler;
		}

		this.#rendered = new Array(this.#count);

		this.#createNode();

		this.#root.addEventListener('scroll', this.#scrollHandler.bind(this));

		setTimeout(() => {
			if (!this.node.children.length) {
				this.#update();
			}
		}, this.#thorottleTime)
	}

	setItems(items) {
		this.#items = [...items];
		this.#count = items.length;
		this.#rendered = new Array(this.#count);
		this.node.innerHTML = '';
		this.#update();
	}

	addItem(item, toTop) {console.log(item)
		if (toTop) {
			this.#items.unshift(item);
			this.#rendered = [];
		}else{
			this.#items.push(item);
		}
		this.#count++;
		this.#update();
	}

	addItems(items, toTop) {
		if (toTop) {
			this.#items.unshift(...items);
			this.#rendered = [];
		}else{
			this.#items.push(...items);
		}
		this.#count += items.length;
		this.#update();
	}

	updateItem(index, item) {
		this.#items[index] = item;
		this.#rendered[index] = undefined;
		this.#removeItem(index);
		this.#update();
	}

	removeItem(index) {
		this.#items.splice(index, 1);
		this.#rendered.splice(index, this.#rendered.length);
		this.#count--;
		this.#removeRangeItems(index, this.#count);
		this.#update();
	}

	removeItems(indexes) {
		indexes.sort((a, b) => b - a);
		const minIndex = indexes[indexes.length - 1];
		this.#rendered.splice(minIndex, this.#count);
		for (const index of indexes) {
			this.#items.splice(index, 1);
			this.#count--;
		}
		this.#removeRangeItems(minIndex);
		this.#update();
	}

	#getScrollTop() {
		return this.#root.scrollY || this.#root.scrollTop || 0;
	}

	#scrollHandler() {
		this.#update();
	}

	#update() {
		if (this.#scrollThrottle) {
			return;
		}

		this.#scrollThrottle = true;

		if (this.#timeout) {
			clearTimeout(this.#timeout);
		}

		this.#timeout = setTimeout(() => {
			this.node.style.height = `${(this.#height + this.#gap) * this.#count}px`;
			this.#updateList();
			this.#scrollThrottle = false;
		}, this.#thorottleTime);
	}

	#updateList() {
		const Y = this.#getScrollTop();
		const start = (Math.floor(Y / (this.#height + this.#gap)) - this.#offset || 0);
		const end = start + this.#max + this.#offset;
		
		const collection = document.createDocumentFragment();
		for (let i = start; i < end; i++) {
			if (!this.#items[i]) {
				continue;
			}
			let child;
			if (!this.#rendered[i]) {
				this.#rendered[i] = this.#renderContainer(i);
			}
			child = this.#rendered[i];
			collection.appendChild(child);
		}

		this.node.appendChild(collection);

		this.#removeOutsideItems(start, end);
	}
	
	#getChildren(callBack) {
		const nodeChildren = this.node.children;
		const nodeChildrenLength = nodeChildren.length;

		if (nodeChildrenLength) {
			for (let i = 0; i < nodeChildrenLength; i++) {
				const child = nodeChildren[i];
				const key = +child.dataset.key;
				if (callBack(key, child)) {
					break
				}
			}
		}
	}

	#removeItem(index) {
		this.#getChildren((key, child) => {
			if (key === index) {
				this.node.removeChild(child);
				return true;
			}
		});
	}

	#removeRangeItems(start, end) {
		const children = [];

		this.#getChildren((key, child) => {
			if (key >= start || key <= end) {
				children.push(child)
			}
		});

		if (children.length) {
			for (const child of children) {
				this.node.removeChild(child)
			}
		}
	}

	#removeOutsideItems(start, end) {
		const children = [];

		this.#getChildren((key, child) => {
			if (key < start || key > end) {
				children.push(child)
			}
		})

		if (children.length) {
			for (const child of children) {
				this.node.removeChild(child)
			}
		}
	}

	#createNode() {
		this.node = document.createElement('div');
		this.node.classList.add('virtuallist');
		this.node.style.position = 'relative';
		this.node.style.height = `${(this.#height + this.#gap) * this.#count}px`;
	}

	#renderContainer(key) {
		const container = document.createElement('div');
		container.classList.add('virtuallist__item');
		container.style.width = '100%';
		container.style.height = `${this.#height}px`;
		container.style.position = 'absolute';
		container.style.left = '0';
		container.style.top = `${key * (this.#height + this.#gap)}px`;
		container.dataset.key = key;

		container.appendChild(this.#renderItem(key, container));

		return container;
	}

	#renderItem(key, container) {
		const item = this.#items[key];
		let template = this.#template.cloneNode(true);
		template = this.renderHandler({key, item, template, container});

		return template;
	}
}

export default VirtualList;