import { createRouter, createWebHashHistory } from 'vue-router';
import Step1 from './views/Step1.vue';
import Step2 from './views/Step2.vue';
import Step3 from './views/Step3.vue';
import Step4 from './views/Step4.vue';
import Step5 from './views/Step5.vue';

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: Step1 },
    { path: '/id', component: Step2 },
    { path: '/import', component: Step3 },
    { path: '/train', component: Step4 },
    { path: '/done', component: Step5 }
  ]
});
