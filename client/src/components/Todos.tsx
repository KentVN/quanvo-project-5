import dateFormat from 'dateformat'
import { History } from 'history'
import update from 'immutability-helper'
import * as React from 'react'
import { Row, Input as Input2,Radio, Col,Typography, Button, Select, Tag, Spin, Space, notification } from 'antd';

import {
  // Button,
  Checkbox,
  Divider,
  Grid,
  Header,
  Icon,
  Input,
  Image,
} from 'semantic-ui-react'

import { createTodo, deleteTodo, getTodos, patchTodo } from '../api/todos-api'
import Auth from '../auth/Auth'
import { Todo } from '../types/Todo'

interface TodosProps {
  auth: Auth
  history: History
}

interface TodosState {
  origin_todos: Todo[]
  todos: Todo[]
  newTodoName: string
  loadingTodos: boolean
  priority: string
  filterValue: string
  statusValue: string
  prioritiesFilter: String[]
}
const { Search } = Input2;
const priorityColorMapping: any = {
  High: 'red',
  Medium: 'blue',
  Low: 'gray',
};
export class Todos extends React.PureComponent<TodosProps, TodosState> {
  state: TodosState = {
    origin_todos: [],
    todos: [],
    newTodoName: '',
    loadingTodos: true,
    priority: "Medium",
    filterValue: '',
    statusValue: 'All',
    prioritiesFilter: [],
  }

  openNotification = (option: string) => {
    if(option === 'existing'){
      notification.open({
        message: 'Error',
        description:
          'The new Todo is already existing in the list todos. Please try again!!!',
        onClick: () => {
          console.log('Notification Clicked!');
        },
      });
    }
    if(option === 'success'){
      notification.open({
        message: 'Success',
        description:
          'Create new todo successfull !!!',
        onClick: () => {
          console.log('Notification Clicked!');
        },
      });
    }
    
  };

  onToDoFilter(){
    const todoListFiltered = this.state.origin_todos.filter((todo: Todo) => {
      if(this.state.statusValue === 'All'){
          return this.state.prioritiesFilter.length ? todo.name.includes(this.state.filterValue) 
          && this.state.prioritiesFilter.includes(todo.priority) : todo.name.includes(this.state.filterValue); 
      }
      return todo.name.includes(this.state.filterValue) && (this.state.statusValue === 'Completed' ?
      todo.done : !todo.done) && (this.state.prioritiesFilter.length ? this.state.prioritiesFilter.includes(todo.priority) : true);
    })
    console.log('this.state.origin_todos ', this.state.origin_todos)
    console.log('todoListFiltered ', todoListFiltered);
    this.setState({
      todos: todoListFiltered
    })
    return todoListFiltered;
  }

  handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ newTodoName: event.target.value })
  }

  onEditButtonClick = (todoId: string) => {
    this.props.history.push(`/todos/${todoId}/edit`)
  }
  onPriorityChange(event: string) {
    this.setState({
      priority: event
    })
  }
  onTodoCreate = async (event: React.ChangeEvent<HTMLButtonElement>) => {
    try {
      this.setState({
        loadingTodos: true
      })
      console.log(this.validateNewTodo(this.state.newTodoName))
      const isExistingTodo = this.validateNewTodo(this.state.newTodoName)
      if(isExistingTodo){
        this.openNotification('existing')
        this.setState({
          loadingTodos: false
        })
      }else{
        const dueDate = this.calculateDueDate()
        const newTodo = await createTodo(this.props.auth.getIdToken(), {
          name: this.state.newTodoName,
          priority: this.state.priority,
          dueDate
        })
        this.setState({
          todos: [...this.state.todos, newTodo],
          newTodoName: '',
          loadingTodos: false
        })
        this.openNotification('success')
      }
    } catch {
      alert('Todo creation failed')
    }
  }

  onTodoDelete = async (todoId: string) => {
    try {
      this.setState({
        loadingTodos: true
      })
      await deleteTodo(this.props.auth.getIdToken(), todoId)
      this.setState({
        todos: this.state.todos.filter(todo => todo.todoId !== todoId),
        loadingTodos: false
      })
    } catch {
      alert('Todo deletion failed')
    }
  }

  onTodoCheck = async (pos: number) => {
    try {
      const todo = this.state.todos[pos]
      this.setState({
        todos: update(this.state.todos, {
          [pos]: { done: { $set: !todo.done } }
        })
      })
      await patchTodo(this.props.auth.getIdToken(), todo.todoId, {
        name: todo.name,
        priority: todo.priority,
        dueDate: todo.dueDate,
        done: !todo.done
      })
    } catch {
      alert('Todo deletion failed')
    }
  }

  onFilterChange = async (e: any) => {
    this.setState({
      filterValue: e.target.value
    }, this.onToDoFilter);
  }

  onFilterStatus = async (e: any) => {
    this.setState({
      statusValue: e.target.value
    } ,this.onToDoFilter)
  }

  onFilterPriorities = async (e: any) => {
    this.setState({
      prioritiesFilter: e
    },this.onToDoFilter)
  }

  validateNewTodo = (newTodo: string) => {
    const isExisting = this.state.origin_todos.find((todo: Todo) => {
      return todo.name === newTodo
    })
    return isExisting;
  }
  async componentDidMount() {
    try {
      const todos = await getTodos(this.props.auth.getIdToken())
      
      this.setState({
        origin_todos: todos,
        todos,
        loadingTodos: false
      })
    } catch (e) {
      alert(`Failed to fetch todos: ${(e as Error).message}`)
    }
  }

  render() {
    return (
      <div>
        <Header as="h1">TODOs</Header>
        {this.renderFilterTodos()}
        {this.renderCreateTodoInput()}
        {this.renderTodosList()}
      </div>
    )
  }

  renderFilterTodos(){
    return(
      <Row justify='center' style={{'marginBottom':'40px'}}>
      <Col span={24}>
        <Typography.Paragraph
          style={{ fontWeight: 'bold', marginBottom: 3, marginTop: 10 }}
        >
          Search
        </Typography.Paragraph>
        <Search placeholder='input search text' value={this.state.filterValue} onChange={(e) => this.onFilterChange(e)}/>
      </Col>
      <Col sm={24}>
        <Typography.Paragraph
          style={{ fontWeight: 'bold', marginBottom: 3, marginTop: 10 }}
        >
          Filter By Status
        </Typography.Paragraph>
        <Radio.Group value={this.state.statusValue} onChange={(e) => this.onFilterStatus(e)}>
          <Radio value='All'>All</Radio>
          <Radio value='Completed'>Completed</Radio>
          <Radio value='Todo'>To do</Radio>
        </Radio.Group>
      </Col>
      <Col sm={24}>
        <Typography.Paragraph
          style={{ fontWeight: 'bold', marginBottom: 3, marginTop: 10 }}
        >
          Filter By Priority
        </Typography.Paragraph>
        <Select
          mode='multiple'
          allowClear
          placeholder='Please select'
          style={{ width: '100%' }}
          onChange={(e)=> this.onFilterPriorities(e)}
          value={this.state.prioritiesFilter}
        >
          <Select.Option value='High' label='High'>
            <Tag color='red'>High</Tag>
          </Select.Option>
          <Select.Option value='Medium' label='Medium'>
            <Tag color='blue'>Medium</Tag>
          </Select.Option>
          <Select.Option value='Low' label='Low'>
            <Tag color='gray'>Low</Tag>
          </Select.Option>
        </Select>
      </Col>
    </Row>
    )
  }

  renderCreateTodoInput() {
    return (
      <Grid.Row>
        <Grid.Column width={16}>
          <Input
            action={{
              color: 'teal',
              labelPosition: 'left',
              icon: 'add',
              content: 'New task',
              onClick: this.onTodoCreate
            }}
            // fluid
            style={{'width':'90%'}}
            actionPosition="left"
            placeholder="To change the world..."
            value={this.state.newTodoName}
            onChange={this.handleNameChange}
          />
          <Select value={this.state.priority} onChange={(e) => this.onPriorityChange(e)} style={{'width':'10%', 'borderLeft':'none', 'height':'39px'}}>
            <Select.Option value='High' label='High'>
              <Tag color='red'>High</Tag>
            </Select.Option>
            <Select.Option value='Medium' label='Medium'>
              <Tag color='blue'>Medium</Tag>
            </Select.Option>
            <Select.Option value='Low' label='Low'>
              <Tag color='gray'>Low</Tag>
            </Select.Option>
          </Select>
        </Grid.Column>
        <Grid.Column width={16}>
          <Divider />
        </Grid.Column>
      </Grid.Row>
    )
  }

  renderTodosList() {
    return (
      <Space direction="vertical" style={{ width: '100%' }}>
        <Spin spinning={this.state.loadingTodos} delay={500} tip="Loading..." size="large">
          <Grid padded>
            {this.state.todos.map((todo, pos) => {
              return (
                <Grid.Row key={todo.todoId} style={{'backgroudColor':'red'}}>
                  <Grid.Column width={1} verticalAlign="middle">
                    <Checkbox
                      onChange={() => this.onTodoCheck(pos)}
                      checked={todo.done}
                    />
                  </Grid.Column>
                  <Grid.Column width={8} verticalAlign="middle">
                    {todo.name}
                  </Grid.Column>
                  <Grid.Column width={2} floated="right">
                    {todo.dueDate}
                  </Grid.Column>
                  <Grid.Column width={2} floated="right">
                    <Tag color={priorityColorMapping[todo.priority]} style={{ margin: 0, fontSize: '1.2em', padding: '4px 12px' }}>
                      {todo.priority ? todo.priority : 'Medium'}
                    </Tag>
                  </Grid.Column>
                  <Grid.Column width={1} floated="right">
                    <Button
                      icon
                      color="blue"
                      onClick={() => this.onEditButtonClick(todo.todoId)}
                    >
                      <Icon name="pencil" />
                    </Button>
                  </Grid.Column>
                  <Grid.Column width={1} floated="right">
                    <Button
                      icon
                      color="red"
                      onClick={() => this.onTodoDelete(todo.todoId)}
                    >
                      <Icon name="delete" />
                    </Button>
                  </Grid.Column>
                  <Grid.Column width={16} style={{display: 'flex', justifyContent: 'center'}}>
                    {todo.attachmentUrl && (
                      <Image src={todo.attachmentUrl} size="small" wrapped />
                    )}
                  </Grid.Column>
                  <Grid.Column width={16}>
                    <Divider />
                  </Grid.Column>
                </Grid.Row>
              )
            })}
          </Grid>
        </Spin>
      </Space>
    )
  }

  calculateDueDate(): string {
    const date = new Date()
    date.setDate(date.getDate() + 7)

    return dateFormat(date, 'yyyy-mm-dd') as string
  }
}
