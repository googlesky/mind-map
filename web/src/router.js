import Vue from 'vue'
import VueRouter from 'vue-router'
import EditPage from '@/pages/Edit/Index'
import WorkbenchePage from '@/pages/Workbenche/Index'
import WorkbencheHomePage from '@/pages/Workbenche/views/Home'
import WorkbencheEditPage from '@/pages/Workbenche/views/Edit'
import WorkbencheHelpPage from '@/pages/Workbenche/views/Help.vue'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    name: 'Edit',
    component: EditPage
  },
  {
    path: '/workbenche',
    name: 'Workbenche',
    component: WorkbenchePage,
    redirect: '/workbenche/home',
    children: [
      {
        path: 'home',
        name: 'WorkbencheHome',
        component: WorkbencheHomePage,
      },
      {
        path: 'edit/:id',
        name: 'WorkbencheEdit',
        component: WorkbencheEditPage,
      },
      {
        path: 'help',
        name: 'WorkbencheHelpPage',
        component: WorkbencheHelpPage,
      }
    ]
  }
]

const router = new VueRouter({
  routes
})

export default router
