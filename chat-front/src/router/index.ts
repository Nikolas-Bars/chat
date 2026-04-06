import { createRouter, createWebHistory } from 'vue-router'
import LoginPage from '../views/LoginPage.vue'
import HelloPage from '../views/HelloPage.vue'
import RegisterPage from '../views/RegisterPage.vue'
import RegistrationConfirmationPage from '../views/RegistrationConfirmationPage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/login',
    },
    {
      path: '/login',
      name: 'login',
      component: LoginPage,
    },
    {
      path: '/hello',
      name: 'hello',
      component: HelloPage,
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterPage,
    },
    {
      path: '/registration-confirmation',
      name: 'registration-confirmation',
      component: RegistrationConfirmationPage,
    },
  ],
})

export default router
