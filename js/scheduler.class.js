import $ from "./elements.js";
import VirtualList from "./virtuallist.class.js";

class Scheduler {
	// Шаблон для задачи
	#template;
	// Объект виртуального списка
	#list;
	// Массив задач
	#tasks = [];
	
	constructor() {
		// Инициализация
		this.init();

		// Рендер
		this.render();
	}

	init() {
		// Инициализация шаблона
		this.templateInit();

		// Получаем задачи из localStorage
		const tasks = localStorage.getItem('tasks');

		// Если есть задачи, то парсим
		if (tasks) {
			this.#tasks = JSON.parse(tasks);
		}

		$.newTask.addEventListener('click', () => {
			// Отображаем форму для добавления задачи
			$.form.classList.add('active');
		})

		// Добавляем обработчик сабмита формы
		$.form.addEventListener('submit', this.addTaskHandler.bind(this))

		$.form.elements.cancel.addEventListener('click', () => {
			// Скрываем форму
			$.form.classList.remove('active');
			// Сбрасываем индекс задачи
			$.form.elements.key.value = '';
		})

		$.sort.addEventListener('change', ({ target }) => {
			// Сортируем задачи по дате
			// создания или сроку
			this.#tasks = this.#tasks.sort((a, b) => {
				if (target.value === 'date') {
					return b.date - a.date;
				}
				return a[target.value] - b[target.value];
			});
			// Обновляем виртуальный список
			this.#list.setItems(this.#tasks);
		})

		// Сохраняем задачи в localStorage перед выгрузкой страницы
		window.addEventListener('beforeunload', () => {
			localStorage.setItem('tasks', JSON.stringify(this.#tasks));
		})
	}

	templateInit() {
		// Создаем шаблон
		const template = document.createDocumentFragment();
		// Забираем шаблон из DOM
		template.appendChild($.task);
		// Находим нужный элемент шаблона
		const task = template.firstElementChild.content.querySelector('.task');
		// Запоминаем шаблон
		this.#template = task;
	}

	addTaskHandler(event) {
		event.preventDefault();
		// Получаем текущую дату
		const date = new Date().getTime();

		const deadline = new Date($.form.elements.deadline.value).getTime();
		// Получаем индекс задачи
		const key = $.form.elements.key.value;
		// Создаём объект задачи
		const task = {
			title: $.form.elements.title.value,
			description: $.form.elements.description.value,
			date,
			deadline,
			status: 0,
		};

		// Если индекс задачи есть,
		// значит это редактирование
		if (key) {
			// Обновляем задачу
			this.#tasks[key] = task;
			// Обновляем виртуальный список
			this.#list.updateItem(key, task);
			// Сбрасываем индекс задачи
			$.form.elements.key.value = '';
		}else{
			// Иначе добавляем задачу
			this.#tasks.unshift(task);
			// Добавляем задачу в виртуальный список
			this.#list.addItem(task, true);
		}
		// Скрываем форму
		$.form.classList.remove('active');
		// Сбрасываем форму
		$.form.reset();
	}

	setStatus(key, status) {
		// Изменяем статус задачи
		const item = {
			...this.#tasks[key],
			status,
		}
		// Обновляем задачу
		this.#tasks[key] = item;
		// Обновляем виртуальный список
		this.#list.updateItem(key, item);
	}

	removeItem(key) {
		this.#tasks.splice(key, 1);
		this.#list.removeItem(key);
	}

	renderHandler({ item, key, template, container }) {
		// Заполняем шаблон данными
		template.innerHTML = template.innerHTML.replace(/{{([^}]+)}}/g, (_, variable) => {
			// Получаем значение
			let value = item[variable];
			// Преобразуем дату
			if (variable === 'date' || variable === 'deadline') {
				value = new Date(value).toLocaleDateString('ru', {
					// year: '2-digit',
					month: 'long',
					day: 'numeric',
					hour: 'numeric',
					minute: 'numeric',
				});
			}
			// Возвращаем значение
			return value || '';
		});

		// Устанавливаем статус
		if (item.status) {
			template.classList.add(item.status === 1 ? 'done' : 'fail');
		}

		let cloneContainer;

		// Обработчик закрытия задачи
		const close = () => {
			$.tasks.removeChild(cloneContainer);
			$.cover.classList.remove('active');
			$.cover.removeEventListener('click', close);
			template.addEventListener('click', open);
		}

		const open = ({ target }) => {
			// Если событие вызвано дочерним элементом
			if (!target.classList.contains('task')) {
				// Получаем родительский task
				target = target.closest('.task');
			}

			// Получаем геометрию task
			const rect = container.getBoundingClientRect();
			
			// Клонируем контейнер и размещаем его над оснсовным
			cloneContainer = container.cloneNode(true);
			cloneContainer.style.top = rect.top + window.scrollY + 'px';
			cloneContainer.style.left = rect.left + 'px';
			cloneContainer.style.width = rect.width + 'px';
			cloneContainer.style.zIndex = 200;

			// Клонируем шаблон и присваиваем класс active
			const cloneTemplate = cloneContainer.firstElementChild;
			cloneTemplate.classList.add('active');

			// Получаем элементы действий
			const deleteBtn = cloneTemplate.querySelector('.task_actions__delete');
			const editBtn = cloneTemplate.querySelector('.task_actions__edit');
			const statusSelect = cloneTemplate.querySelector('.task_actions__status');

			// Устанавливаем дефолтное значение
			statusSelect.value = item.status;

			statusSelect.addEventListener('change', () => {
				// Получаем новый статус
				const status = +statusSelect.value;
				// Очищаем от текущего
				cloneTemplate.classList.remove('done', 'fail');

				// Если статус не "В процессе"
				if (status) {
					// Устанавливаем статус для клона
					cloneTemplate.classList.add(status === 1 ? 'done' : 'fail');
				}
				
				// Изменяем статус
				this.setStatus(key, status);
			});

			deleteBtn.addEventListener('click', () => {
				// Удаляем задачу
				this.removeItem(key, item);
				// Закрываем окно задачи
				close();
			});

			editBtn.addEventListener('click', () => {
				// Подготавливаем форму к редактированию
				$.form.elements.title.value = item.title;
				$.form.elements.description.value = item.description;
				$.form.elements.deadline.value = item.deadline;
				$.form.elements.key.value = key;
				// Отображаем форму
				$.form.classList.add('active');
				// Закрываем окно задачи
				close();
			});

			// Отображаем обложку
			$.cover.classList.add('active');
			// Добавляем обработчик закрытия
			$.cover.addEventListener('click', close);
			
			// Удаляем обработчик открытия т.к. уже открыт
			template.removeEventListener('click', open);

			// Отображаем клона
			$.tasks.appendChild(cloneContainer);
		}

		// Добавляем обработчик открытия
		template.addEventListener('click', open);

		// Возвращаем шаблон
		return template;
	}

	render() {
		// Создаем список задач
		this.#list = new VirtualList({
			items: this.#tasks,
			template: this.#template,
			renderHandler: this.renderHandler.bind(this),
			height: 59
		});

		// Отображаем список
		$.tasks.appendChild(this.#list.node);
	}

}

export default Scheduler;