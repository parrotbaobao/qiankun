<template>
    <MdText :content="props.message?.content" :streaming="props.streaming"></MdText>
</template>


<script setup lang="ts">
import MdText from './MdText.vue'

const props = defineProps<{
    message: {
        id: string,
        content: string,
        from: 'user' | 'ai',
        createdAt: number,
    };
    streaming?: boolean
}>()
</script>