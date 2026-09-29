<script setup lang="ts">
/**
 * ResponsiveSheet — 跨设备弹层编排器
 * Desktop(≥1024): 右侧 SideSheet
 * Tablet(600–1023): 居中 Modal
 * Mobile(<600): 底部 BottomSheet
 * 三端共享同一内容插槽，仅表现形态不同。
 */
import { useBreakpoints } from '../../composables/useBreakpoint'
import BottomSheet from './BottomSheet.vue'
import Modal from './Modal.vue'
import SideSheet from './SideSheet.vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    height?: 'auto' | 'tall'
  }>(),
  { height: 'auto' },
)

const emit = defineEmits<{ close: [] }>()

const { mobile, desktop } = useBreakpoints()

const onClose = () => emit('close')
</script>

<template>
  <SideSheet v-if="desktop" :open="open" :title="title" @close="onClose">
    <slot />
    <template v-if="$slots.footer" #footer><slot name="footer" /></template>
  </SideSheet>

  <Modal v-else-if="!mobile" :open="open" :title="title" size="md" @close="onClose">
    <slot />
    <template v-if="$slots.footer" #footer><slot name="footer" /></template>
  </Modal>

  <BottomSheet v-else :open="open" :title="title" :height="height" @close="onClose">
    <slot />
    <template v-if="$slots.footer" #footer><slot name="footer" /></template>
  </BottomSheet>
</template>
