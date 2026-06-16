<template>
    <div ref="containerRef" class="viewport" @scroll="onScroll">
        <div :style="{ height: totalHeight + 'px' }">
            <ul :style="{ transform: `translateY(${offsetY}px)` }">
                <li v-for="(value, index) in visibleData" :key="index"
                    :ref="(el) => setItemRef(el as HTMLElement, startIndex + index)">
                    {{ value.name }}
                </li>
            </ul>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';

const props = defineProps({
    data: {
        type: Array as () => Array<{ id: number; name: string }>,
        required: true,
    },
});
const estimatedHeight = 40;
const buffer = 10;

const containerHeight = ref(0);
const scrollTop = ref(0);
const ticking = ref(false);

const positions = ref(new Array(props.data.length));
const heights = ref(Array(props.data.length).fill(estimatedHeight));
const containerRef = ref<HTMLDivElement | null>(null);

const totalHeight = computed(() => positions.value[props.data.length - 1] + heights.value[props.data.length - 1]);
const rawStart = computed(() => binarySearch(positions.value, scrollTop.value));
const viewportCount = computed(() => Math.ceil(containerHeight.value / estimatedHeight) + 1);

const startIndex = computed(() => Math.max(0, (rawStart.value - buffer)));
const endIndex = computed(() => Math.min(props.data.length, rawStart.value + viewportCount.value + buffer));
const visibleData = computed(() => props.data.slice(startIndex.value, endIndex.value));

const offsetY = computed(() => positions.value[startIndex.value]);

const isAdjusting = ref(false);


onMounted(() => {
    initPositions();
    if (containerRef.value) {
        containerHeight.value = containerRef.value.clientHeight;
    }
    onUnmounted(() => {
        observer.disconnect();
    });
});

const initPositions = () => {
    positions.value[0] = 0;
    for (let i = 1; i < positions.value.length; i++) {
        positions.value[i] = positions.value[i - 1] + heights.value[i - 1];
    }
}

const observer = new ResizeObserver((entries) => {
    let changed = false;
    for (const entry of entries) {
        const el = entry.target as HTMLElement;
        const index = Number(el.dataset.index);
        const realHeight = Math.round(el.getBoundingClientRect().height);
        if (heights.value[index] === realHeight) continue;
        heights.value[index] = realHeight;
        changed = true;
    }
    if (changed) updatePositions();
});

function updatePositions() {
    const h = heights.value;
    const oldOffset = positions.value[rawStart.value] ?? 0;

    const p = new Array(h.length);  // 普通数组，不是 positions.value
    p[0] = 0;
    for (let i = 1; i < h.length; i++) {
        p[i] = p[i - 1] + h[i - 1];
    }

    const newOffset = p[rawStart.value] ?? 0;
    const delta = newOffset - oldOffset;

    positions.value = p;  // 一次性赋值

    if (delta !== 0 && containerRef.value) {
        isAdjusting.value = true;
        containerRef.value.scrollTop += delta;
        scrollTop.value = containerRef.value.scrollTop;
        requestAnimationFrame(() => {
            isAdjusting.value = false;
        });
    }
}


const measuredSet = new Set<number>();

const setItemRef = (el: HTMLElement | null, index: number) => {
    if (!el) return;
    if (measuredSet.has(index)) return;  // 测过了，跳过
    el.dataset.index = String(index);
    observer.observe(el);
    measuredSet.add(index);
};

const onScroll = () => {
    if (isAdjusting.value) return;   // 补偿引起的滚动，不处理
    if (ticking.value) return;
    ticking.value = true;
    requestAnimationFrame(() => {
        ticking.value = false;
        scrollTop.value = containerRef.value?.scrollTop ?? 0;
    })
};

function binarySearch(positions: number[], target: number): number {
    let low = 0;
    let high = positions.length - 1;

    while (low <= high) {
        let mid = Math.floor((low + high) / 2);
        if (positions[mid] <= target) {
            low = mid + 1
        } else {
            high = mid - 1;
        }
    }
    return high;
}

</script>

<style scoped>
.viewport {
    height: 500px;
    /* 固定视口 */
    overflow-y: auto;
    /* 产生滚动 */
}
</style>