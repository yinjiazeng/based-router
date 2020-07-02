# based-router
一个简单的路由器

```js
import { create, replace, matchPath } from 'based-router';

create(function(location) {
  if (matchPath(location, '/')) {
    // do something
  } else if (matchPath(location, '/list')) {
    // do something
  } else if (matchPath(location, '/detail/:id')) {
    // do something
  } else {
    // no match
  }
});
```
