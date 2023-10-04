export interface TodoItem {
  userId: string
  todoId: string
  createdAt: string
  name: string
  priority: string
  dueDate: string
  done: boolean
  attachmentUrl?: string
}
