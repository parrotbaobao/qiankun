<template>
    <div ref="containerRef" class="viewport" @scroll="onScroll">
        <div :style="{ height: totalHeight + 'px' }">
            <ul :style="{ transform: `translateY(${offsetY}px)` }">
                <li v-for="value in visibleData" :key="value.id">
                    {{ value.name }}
                </li>
            </ul>
        </div>
    </div>

</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';


const containerHeight = ref(0);
const visibleCount = computed(() => Math.ceil(containerHeight.value / itemSize) + 1);
const buffer = 5;
const itemSize = 100;
const totalHeight = computed(() => {
    return itemSize * (props.data.length || 1);
});
const ticking = ref(false);
const scrollTop = ref(0);
const containerRef = ref<HTMLElement | null>(null)

const rawStart = computed(() => Math.floor(scrollTop.value / itemSize));
const startIndex = computed(() => Math.max(0, rawStart.value - buffer));
const endIndex = computed(() => Math.min(props.data.length, rawStart.value + visibleCount.value + buffer));

const visibleData = computed(() => {
    return props.data.slice(startIndex.value, endIndex.value)
})
const offsetY = computed(() => {
    return startIndex.value * itemSize;
});

const props = defineProps({
    data: {
        type: Array as () => Array<{ id: number; name: string }>,
        required: true,
    },
});

onMounted(() => {
    // 1. 挂载后立即读一次
    if (containerRef.value) {
        containerHeight.value = containerRef.value.clientHeight;
    }
    // 2. 后续尺寸变化自动更新
    const observer = new ResizeObserver((entries) => {
        containerHeight.value = entries[0].contentRect.height;
    });

    if (containerRef.value) {
        observer.observe(containerRef.value);
    }

    onUnmounted(() => observer.disconnect());
})

const onScroll = () => {
    if (ticking.value) return;
    ticking.value = true;
    requestAnimationFrame(() => {
        ticking.value = false;
        scrollTop.value = containerRef.value?.scrollTop ?? 0;
    })
};

</script>

<style scoped>
.viewport {
    height: 500px;
    /* 固定视口 */
    overflow-y: auto;
    /* 产生滚动 */
}
</style>