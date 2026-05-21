import { defineStore } from "pinia"
import { ref } from "process"

export const useUserStore = defineStore("user", () => {
    const userInfo = ref({})
}) 