import { Hono } from 'hono'
import { serve } from '@hono/node-server'

const app = new Hono()

app
  .get('/a', (c) => {
    return c.redirect('/b')
  })
  .get('/b', (c) => {
    return c.text('Hello World')
  })

serve(app, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
