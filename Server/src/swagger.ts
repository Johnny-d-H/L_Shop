const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'L Shop API',
    version: '1.0.0',
    description: 'Документация API интернет-магазина',
  },
  servers: [
    {
      url: 'http://localhost:5000/api',
      description: 'Локальный сервер',
    },
  ],
  components: {
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          name: { type: 'string' },
        },
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          name: { type: 'string' },
          price: { type: 'number' },
          count: { type: 'number' },
          hero: { type: 'string' },
          description: { type: 'string' },
          rarity: { type: 'string' },
          ownerId: { type: 'number' },
        },
      },
      CartItem: {
        type: 'object',
        properties: {
          productId: { type: 'number' },
          qty: { type: 'number' },
        },
      },
      CartResponse: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            productId: { type: 'number' },
            qty: { type: 'number' },
            name: { type: 'string' },
            price: { type: 'number' },
          },
        },
      },
      AuthRequest: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          password: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
        },
        required: ['name', 'password'],
      },
      CreateProductRequest: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          price: { type: 'number' },
          count: { type: 'number' },
          hero: { type: 'string' },
          description: { type: 'string' },
          rarity: { type: 'string' },
        },
        required: ['name', 'price'],
      },
      AddCartItemRequest: {
        type: 'object',
        properties: {
          productId: { type: 'number' },
          qty: { type: 'number' },
        },
        required: ['productId', 'qty'],
      },
    },
  },
  paths: {
    '/register': {
      post: {
        summary: 'Регистрация нового пользователя',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthRequest' },
            },
          },
        },
        responses: {
          '201': { description: 'Пользователь зарегистрирован' },
          '400': { description: 'Неправильные данные' },
        },
      },
    },
    '/login': {
      post: {
        summary: 'Вход пользователя',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthRequest' },
            },
          },
        },
        responses: {
          '200': { description: 'Успешный вход' },
          '400': { description: 'Неправильные данные' },
          '401': { description: 'Неверные учетные данные' },
        },
      },
    },
    '/logout': {
      post: {
        summary: 'Выход пользователя',
        responses: {
          '200': { description: 'Успешный выход' },
        },
      },
    },
    '/me': {
      get: {
        summary: 'Информация о текущем пользователе',
        responses: {
          '200': { description: 'Пользователь или null' },
        },
      },
    },
    '/products': {
      get: {
        summary: 'Получить список продуктов',
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Поиск по названию или описанию' },
          { name: 'sort', in: 'query', schema: { type: 'string', enum: ['price_asc', 'price_desc'] }, description: 'Сортировка по цене' },
          { name: 'hero', in: 'query', schema: { type: 'string' }, description: 'Фильтр по герою' },
          { name: 'inStock', in: 'query', schema: { type: 'string', enum: ['true', 'false'] }, description: 'Только товары в наличии' },
        ],
        responses: {
          '200': { description: 'Список продуктов' },
        },
      },
      post: {
        summary: 'Добавить продукт',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateProductRequest' },
            },
          },
        },
        responses: {
          '201': { description: 'Товар добавлен' },
          '400': { description: 'Неправильные данные' },
          '403': { description: 'Требуется авторизация' },
        },
      },
    },
    '/my-lots': {
      get: {
        summary: 'Список собственных лотов',
        responses: {
          '200': { description: 'Список лотов пользователя' },
          '401': { description: 'Требуется вход' },
        },
      },
    },
    '/my-lots/{id}': {
      delete: {
        summary: 'Удалить собственный лот',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'number' } }],
        responses: {
          '200': { description: 'Лот удален' },
          '401': { description: 'Требуется вход' },
          '404': { description: 'Лот не найден или не является владельцем' },
        },
      },
    },
    '/buy/{id}': {
      post: {
        summary: 'Купить товар',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'number' } }],
        responses: {
          '200': { description: 'Покупка завершена' },
          '401': { description: 'Требуется вход' },
          '404': { description: 'Товар не найден' },
          '400': { description: 'Нельзя купить свой лот' },
        },
      },
    },
    '/cart/checkout': {
      post: {
        summary: 'Оформить заказ из корзины',
        responses: {
          '200': { description: 'Заказ оформлен' },
          '400': { description: 'Корзина пуста или ошибка' },
          '401': { description: 'Требуется вход' },
        },
      },
    },
    '/inventory': {
      get: {
        summary: 'История покупок пользователя',
        responses: {
          '200': { description: 'Список покупок' },
          '401': { description: 'Требуется вход' },
        },
      },
    },
    '/cart': {
      get: {
        summary: 'Получить содержимое корзины',
        responses: {
          '200': { description: 'Содержимое корзины' },
          '401': { description: 'Требуется вход' },
        },
      },
      post: {
        summary: 'Добавить товар в корзину',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AddCartItemRequest' },
            },
          },
        },
        responses: {
          '200': { description: 'Товар добавлен' },
          '400': { description: 'Неправильные данные' },
          '401': { description: 'Требуется вход' },
          '404': { description: 'Товар не найден' },
        },
      },
      put: {
        summary: 'Обновить количество товара в корзине',
        parameters: [{ name: 'productId', in: 'path', required: true, schema: { type: 'number' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { qty: { type: 'number' } },
                required: ['qty'],
              },
            },
          },
        },
        responses: {
          '200': { description: 'Кол-во обновлено' },
          '400': { description: 'Неправильные данные' },
          '401': { description: 'Требуется вход' },
          '404': { description: 'Товар не найден в корзине' },
        },
      },
    },
    '/cart/{productId}': {
      delete: {
        summary: 'Удалить товар из корзины',
        parameters: [{ name: 'productId', in: 'path', required: true, schema: { type: 'number' } }],
        responses: {
          '200': { description: 'Товар удален' },
          '401': { description: 'Требуется вход' },
          '404': { description: 'Товар не найден в корзине' },
        },
      },
    },
  },
};

export default swaggerDocument;
