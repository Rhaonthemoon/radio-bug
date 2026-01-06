import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'

import App from './App.vue'
import router from './router'

// CSS PrimeVue - devono essere qui!

// PrimeVue Components
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Dialog from 'primevue/dialog'
import Textarea from 'primevue/textarea'
import Calendar from 'primevue/calendar'
import Tag from 'primevue/tag'
import Toast from 'primevue/toast'
import ToastService from 'primevue/toastservice'
import ConfirmDialog from 'primevue/confirmdialog'
import ConfirmationService from 'primevue/confirmationservice'
import Menu from 'primevue/menu'
import Avatar from 'primevue/avatar'
import Badge from 'primevue/badge'
import Dropdown from 'primevue/dropdown'
import ProgressBar from 'primevue/progressbar'
// Components
import Message from 'primevue/message'

// Directives
import Tooltip from 'primevue/tooltip'


const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(PrimeVue)
app.use(ToastService)
app.use(ConfirmationService)
// Components

// Registra
app.component('Message', Message)
app.directive('tooltip', Tooltip)
// Registra
app.component('Message', Message)
app.directive('tooltip', Tooltip)
// Register PrimeVue components globally
app.component('Button', Button)
app.component('InputText', InputText)
app.component('Password', Password)
app.component('Card', Card)
app.component('DataTable', DataTable)
app.component('Column', Column)
app.component('Dialog', Dialog)
app.component('Textarea', Textarea)
app.component('Calendar', Calendar)
app.component('Tag', Tag)
app.component('Toast', Toast)
app.component('ConfirmDialog', ConfirmDialog)
app.component('Menu', Menu)
app.component('Avatar', Avatar)
app.component('Badge', Badge)
app.component('Dropdown', Dropdown)
app.component('ProgressBar', ProgressBar)
app.mount('#app')
