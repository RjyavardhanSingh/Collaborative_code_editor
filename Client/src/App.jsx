import React from 'react'
import { useRoutes} from 'react-router-dom'
import {routes} from './routes'
import {AuthProvider} from './context/AuthProvider'

const App = () => {
  const routing = useRoutes(routes)

  return <AuthProvider>{routing}</AuthProvider>
}

export default App
