/* 打开交易编辑弹层的便捷入口（列表点击复用） */
import type { Transaction } from '../data/types'
import { useUi } from './useUi'

export function openEditFromItem(t: Transaction) {
  const ui = useUi()
  ui.openEditSheet(t)
}
