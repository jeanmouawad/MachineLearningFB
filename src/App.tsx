import React from 'react';

import './App.css';
import {
    RouterProvider,
    Route,
    createBrowserRouter,
    createRoutesFromElements,
    useRouteError,
    Navigate,
} from 'react-router-dom';
import { Provider } from 'jotai';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { StyledEngineProvider } from '@mui/material/styles';
import About from './views/About/About';
import Home from './views/Home/Home';
import Login from './views/Login/Login';
import AuthGuard from './components/AuthGuard/AuthGuard';

function ErrorComponent() {
    const error = useRouteError();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((error as any).status === 404) {
        return (
            <section className="errorView">
                <h1>Page not found</h1>
            </section>
        );
    }

    if (import.meta.env.DEV) {
        console.error(error);
    }

    return (
        <section className="errorView">
            <h1>Something went wrong</h1>
            <p>Refresh the page to try again. If the problem continues, contact the demo administrator.</p>
        </section>
    );
}

export const routes = createRoutesFromElements(
    <Route
        path="/"
        ErrorBoundary={ErrorComponent}
        hydrateFallbackElement={<div />}
    >
        <Route
            path="login"
            element={<Login />}
        />
        <Route
            path="deploy/p/:code"
            lazy={() => import('./views/Deployment/PeerDeployment')}
        />
        <Route
            path="collect/:code/:classIndex"
            lazy={() => import('./views/Collection/Collection')}
        />
        <Route
            path="input/:code"
            lazy={() => import('./views/Input/Input')}
        />
        <Route element={<AuthGuard />}>
            <Route
                index
                element={
                    <Navigate
                        replace
                        to="/home"
                    />
                }
            />
            <Route
                path="about"
                element={<About />}
            />
            <Route
                path="home"
                element={<Home />}
            />
            <Route
                path=":kind/:variant"
                lazy={() => import('./views/General/General')}
            />
        </Route>
    </Route>
);
const defaultRouter = createBrowserRouter(routes);

interface Props {
    router?: typeof defaultRouter;
}

function App({ router }: Props) {
    return (
        <React.Suspense fallback={<div></div>}>
            <Provider>
                <DndProvider backend={HTML5Backend}>
                    <StyledEngineProvider injectFirst>
                        <RouterProvider router={router || defaultRouter} />
                    </StyledEngineProvider>
                </DndProvider>
            </Provider>
        </React.Suspense>
    );
}

export default App;
