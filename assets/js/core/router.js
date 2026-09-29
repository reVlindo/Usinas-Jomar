/**
 * SPA Router
 */
const Router = {
  routes: {},
  currentRoute: null,

  init() {
    window.addEventListener('hashchange', () => this.handleHashChange());
    
    // Init initial route
    if (!window.location.hash) {
      window.location.hash = '#/dashboard';
    } else {
      this.handleHashChange();
    }
  },

  on(path, callback) {
    this.routes[path] = callback;
  },

  navigate(path) {
    window.location.hash = path;
  },

  handleHashChange() {
    const hash = window.location.hash.substring(1) || '/dashboard';
    let matched = false;

    // Check static routes
    if (this.routes[hash]) {
      this.updateActiveNav(hash.substring(1));
      this.routes[hash]();
      matched = true;
    } else {
      // Check dynamic routes like /plant/:id
      for (const routePath in this.routes) {
        if (routePath.includes(':')) {
          const routeParts = routePath.split('/');
          const hashParts = hash.split('/');
          
          if (routeParts.length === hashParts.length) {
            let isMatch = true;
            let params = {};
            
            for (let i = 0; i < routeParts.length; i++) {
              if (routeParts[i].startsWith(':')) {
                const paramName = routeParts[i].substring(1);
                params[paramName] = hashParts[i];
              } else if (routeParts[i] !== hashParts[i]) {
                isMatch = false;
                break;
              }
            }
            
            if (isMatch) {
              this.updateActiveNav(routeParts[1]); // e.g. 'plant'
              this.routes[routePath](params);
              matched = true;
              break;
            }
          }
        }
      }
    }

    if (!matched) {
      this.navigate('/dashboard');
    }
  },

  updateActiveNav(routeName) {
    document.querySelectorAll('.sidebar-nav .nav-link').forEach(el => {
      el.classList.remove('active');
      if (el.dataset.route === routeName) {
        el.classList.add('active');
      }
    });
  }
};
