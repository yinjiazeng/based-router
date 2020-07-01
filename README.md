# based-router
一个简单的路由器

```js
import { create, replace } from 'based-router';

const router = create({ type: 'hash', basename: '/' });

router.get('/', (location) => {
  // do something
});

router.get('/home', (location) => {
  // do something
});

router.get('/detail/:id', (location) => {
  // do something
});

router.get('*', () => {
  replace('/');
});
```