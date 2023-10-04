export interface Todo {
  todoId: string
  createdAt: string
  name: string
  priority: string
  dueDate: string
  done: boolean
  attachmentUrl?: string
}
