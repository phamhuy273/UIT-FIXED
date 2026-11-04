import { RouterProvider } from 'react-router-dom';
import { AuthBootstrap } from './features/auth/auth-bootstrap';
import { router } from './routes/app-routes';

export function App() {
  return (
    <AuthBootstrap>
      <RouterProvider router={router} />
    </AuthBootstrap>
  );
}

export default App;
