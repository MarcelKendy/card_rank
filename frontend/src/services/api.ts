import axios from 'axios'

const api = axios.create({
    baseURL: 'https://cardrank-2yup1.sevalla.app/api',
})

export default api
