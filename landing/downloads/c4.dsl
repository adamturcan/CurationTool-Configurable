workspace "Memorise" "Client-side React SPA paired with a Node/Express backend API." {

    model {
        properties {
             "structurizr.groupSeparator" "/"
        }

        user = person "Curator" "A user who annotates text, manages workspaces, and exports data."
        admin = person "Administrator" "A user who manages system configuration and infrastructure settings."

        externalApi = softwareSystem "External APIs" "External NLP APIs (NER, Segmentation, Classification, Translation)." "External System"
        Storage = softwareSystem "Storage" "Physical storage for users, workspaces, endpoint config and the thesaurus index (JSON file by default; pluggable)." "External System"

        system = softwareSystem "Data Curation Tool" "React-based annotation platform" {

            webApp = container "Web Application" "React Frontend (SPA)" "TypeScript/React" "Web Browser" {

                group "Routing & Shell" {
                    appOrchestrator = component "App Orchestrator" "Top-level component that mounts routes, layouts and global providers." "React Component" "React Component"
                    presentationErrorBoundary = component "ErrorBoundary" "Top-level boundary that catches render-time errors in the app tree." "React Component" "React Component"
                    presentationSynchronizer = component "StateSynchronizer" "Drives boot sync, route sync and auto-save effects." "React Component" "React Component"
                    presentationNotification = component "NotificationSnackbar" "Renders global toasts and alerts." "React Component" "React Component"
                }

                group "State Stores" {
                    presentationAuthStore = component "AuthStore" "Zustand store holding the auth token, current user and role." "State Store" "State Store"
                    presentationWorkspaceStore = component "WorkspaceStore" "Zustand store holding workspace list metadata." "State Store" "State Store"
                    presentationSessionStore = component "SessionStore" "Zustand store holding the active working set with dirty-checking." "State Store" "State Store"
                    presentationNotificationStore = component "NotificationStore" "Zustand store backing the central message queue." "State Store" "State Store"
                }

                group "Pages" {
                    loginPage = component "LoginPage" "Sign-in and registration page (/login)." "Page Component" "Page Component"
                    workspacePage = component "WorkspacePage" "Editor page for an active workspace (/workspace/:id)." "Page Component" "Page Component"
                    manageWorkspacesPage = component "ManageWorkspacesPage" "Workspace list and lifecycle actions (/manage-workspaces)." "Page Component" "Page Component"
                    accountPage = component "AccountPage" "Per-user account view (/manage-account)." "Page Component" "Page Component"
                    servicesPage = component "ServicesPage" "Route /services. Admin-only configuration panel with NLP endpoint health monitoring." "Page Component" "Page Component"
                }

                group "UI Layout Containers" {
                    presentationEditorContainer = component "EditorContainer" "Central canvas hosting the text and its annotations." "React Component" "React Component"
                    presentationPanelContainer = component "PanelContainer" "Right panel hosting the tag table and thesaurus autocomplete." "React Component" "React Component"
                }

                group "Client Infrastructure" {
                    infrastructureConfigClient = component "ConfigClient" "Provides NLP endpoint URLs to the API client; reads from env vars in standalone mode or from the backend in server mode (cached)." "Client Service"  "Client Service"
                    infrastructureStorageGateway = component "StorageGateway" "Routes save() to either the local adapter or the remote workspace API." "Client Service" "Client Service"
                    infrastructureLocalStorageAdapter = component "LocalStorageAdapter" "LocalStorage wrapper for the local persistence mode." "Client Service" "Client Service"
                    infrastructureThesaurusIndexLoader = component "ThesaurusIndexLoader" "Fetches and caches the thesaurus index on the main thread for hierarchy display and classifier label mapping." "Client Service" "Client Service"
                    infrastructureExportEngine = component "ExportEngine" "Generates JSON and PDF artifacts of a workspace in-browser." "Client Service" "Client Service"
                    thesaurusWorker = component "Thesaurus Web Worker" "Loads a pre-built thesaurus index on startup and answers fuzzy search messages from the UI off the main thread." "Web Worker" "Web Worker"
                }
            }

            backendApi = container "Backend API" "Node/Express server. Thin routing and adapter dispatch, no application service layer." "Express / TypeScript" "Server Container" {

                group "API Layer" {
                    authApi = component "AuthAPI" "POST /auth/login, /register, /logout, /refresh." "API Endpoint" "API Endpoint"
                    configApi = component "ConfigAPI" "GET/PUT /api/config. POST /api/health (endpoint probe)." "API Endpoint" "API Endpoint"
                    nlpApi = component "NlpAPI" "POST /api/{ner|segment|classify|translate}. GET /api/translate/languages. Resolves the right adapter and proxies the call." "API Endpoint" "API Endpoint"
                    workspaceApi = component "WorkspaceAPI" "GET/POST/PUT/DELETE /api/workspaces. PUT /api/workspaces/:id/segments." "API Endpoint" "API Endpoint"
                }

                group "Middleware" {
                    authMiddleware = component "AuthMiddleware" "JWT verification + admin-role guard for protected routes." "Infra Service" "Infra Service"
                }

                group "Infrastructure Layer" {
                    adapterRegistry = component "AdapterRegistry" "Registry of NLP adapters keyed by service type. Resolves the configured adapter at request time." "Infra Service" "Infra Service"
                    nlpAdapters = component "NLP Adapters" "Per-service adapters (NER, Segment, Classify, Translate) that translate requests/responses for the External APIs." "Infra Service" "Infra Service"
                    dbAdapter = component "DB Adapter" "Persists users, workspaces and endpoint config (JSON file by default; pluggable)." "Repository" "Repository"
                }
            }

            user -> webApp "Uses to annotate data"
            admin -> webApp "Uses to configure system"

            appOrchestrator -> loginPage "Routes"
            appOrchestrator -> workspacePage "Routes"
            appOrchestrator -> manageWorkspacesPage "Routes"
            appOrchestrator -> servicesPage "Routes"
            appOrchestrator -> accountPage "Routes"
            appOrchestrator -> presentationSynchronizer "Mounts"
            appOrchestrator -> presentationNotification "Renders"
            appOrchestrator -> presentationErrorBoundary "Wrapped by"

            loginPage -> presentationAuthStore "Sets auth token / current user"
            manageWorkspacesPage -> presentationWorkspaceStore "Reads / Updates Workspaces"
            accountPage -> presentationWorkspaceStore "Reads workspaces"
            presentationSynchronizer -> presentationWorkspaceStore "Reads Metadata"
            presentationSynchronizer -> presentationSessionStore "Monitors for Changes"

            workspacePage -> presentationEditorContainer "Renders"
            workspacePage -> presentationPanelContainer "Renders"
            presentationEditorContainer -> presentationSessionStore "Reads/Writes"
            presentationPanelContainer -> presentationSessionStore "Reads/Writes"

            workspacePage -> presentationNotificationStore "Enqueues notices"
            servicesPage -> presentationNotificationStore "Enqueues notices"
            manageWorkspacesPage -> presentationNotificationStore "Enqueues notices"
            presentationNotification -> presentationNotificationStore "Renders notifications from"

            infrastructureConfigClient -> configApi "Loads endpoint config (server mode)"
            presentationSynchronizer -> infrastructureStorageGateway "Calls save()"
            infrastructureStorageGateway -> infrastructureLocalStorageAdapter "If Local"
            infrastructureStorageGateway -> workspaceApi "If Remote"

            loginPage -> authApi "Login / register / refresh"
            manageWorkspacesPage -> workspaceApi "List / create / delete workspaces"
            presentationEditorContainer -> nlpApi "Triggers NER, Segment, Classify, Translate"
            servicesPage -> configApi "Probes endpoint health; admin updates endpoint config"
            servicesPage -> infrastructureConfigClient "Reads / writes endpoint config (admin)"

            presentationPanelContainer -> thesaurusWorker "Searches for tag autocomplete via postMessage"
            presentationPanelContainer -> infrastructureThesaurusIndexLoader "Loads index for tag hierarchy display"
            presentationEditorContainer -> infrastructureThesaurusIndexLoader "Maps classifier label IDs to thesaurus entries"
            thesaurusWorker -> Storage "Fetches the thesaurus index (static asset)"
            infrastructureThesaurusIndexLoader -> Storage "Fetches the thesaurus index (static asset, cached)"

            manageWorkspacesPage -> infrastructureExportEngine "Triggers JSON / PDF export"
            infrastructureExportEngine -> workspaceApi "Loads full workspace before generating"

            authApi -> dbAdapter "Looks up / persists users"
            workspaceApi -> authMiddleware "Protected by"
            workspaceApi -> dbAdapter "CRUD workspaces"
            configApi -> authMiddleware "Protected by (admin for PUT)"
            configApi -> dbAdapter "Reads / writes endpoint config"
            nlpApi -> authMiddleware "Protected by"
            nlpApi -> dbAdapter "Reads endpoint config (URL + adapter key)"
            nlpApi -> adapterRegistry "Resolves adapter for service type"
            adapterRegistry -> nlpAdapters "Provides"
            authMiddleware -> dbAdapter "Verifies user / role"

            nlpAdapters -> externalApi "HTTPS"
            dbAdapter -> Storage "Reads / writes JSON file (default)"
        }
    }

    views {
        systemContext system "SystemLandscape" {
            include *
            title "Memorise - System Landscape"
            description "Actors and External Systems interacting with the Tool."
        }

        container system "SystemContainers" {
            include *
            title "Memorise - Container Architecture"
            description "High-level split: React Client, Backend API, and external Storage."
        }

        component webApp "ClientArchitecture" {
            include *
            include backendApi
            title "Memorise UI - Client Architecture"
            description "React Presentation Layer + Client Infrastructure."
        }

        component backendApi "BackendArchitecture" {
            include *
            include webApp
            title "Memorise API - Backend Architecture"
            description "Routers, middleware and adapters. No service / domain layer — routes call the registry and DB directly."
        }

        theme default

        styles {
            element "Web Browser" {
                background #e3f2fd
                color #0d47a1
                stroke #0d47a1
                strokeWidth 2
            }
            element "Server Container" {
                background #f3e5f5
                color #4a148c
                stroke #4a148c
                strokeWidth 2
            }
            element "Database" {
                shape Cylinder
                background #eceff1
                color #000000
                stroke #37474f
            }
            element "Web Worker" {
                shape Hexagon
                background #e8f5e9
                color #1b5e20
            }

            element "Person" {
                shape Person
                background #0d47a1
                color #ffffff
            }

            element "React Component" {
                background #ffffff
                color #000000
                stroke #1e88e5
            }
            element "Page Component" {
                background #ffffff
                color #000000
                stroke #d32f2f
                strokeWidth 3
                shape WebBrowser
            }

            element "State Store" {
                background #ffe0b2
                color #000000
                shape RoundedBox
                stroke #ef6c00
                strokeWidth 2
            }

             element "Client Service" {
                background #fafafa
                color #000000
                shape RoundedBox
                stroke #757575
            }

            element "API Endpoint" {
                background #ffffff
                color #000000
                shape RoundedBox
                stroke #7b1fa2
                strokeWidth 2
            }
            element "App Service" {
                background #f1f8e9
                color #000000
                shape RoundedBox
                stroke #33691e
            }
            element "Infra Service" {
                background #fafafa
                color #000000
                shape RoundedBox
                stroke #616161
            }
            element "Repository" {
                shape Cylinder
                background #eceff1
                color #000000
                stroke #616161
            }
            element "Use Case" {
                shape Ellipse
                background #e0f7fa
                stroke #006064
                color #000000
            }

            element "External System" {
                background #ffebee
                color #b71c1c
                stroke #b71c1c
            }

            element "Group" {
                color #757575
                strokeWidth 10
            }

            element "Group:Routing & Shell" {
                color #42a5f5
                stroke #42a5f5
            }
            element "Group:State Stores" {
                color #ffa726
                stroke #ffa726
            }
            element "Group:Pages" {
                color #ef5350
                stroke #ef5350
            }
            element "Group:UI Layout Containers" {
                color #29b6f6
                stroke #29b6f6
            }
            element "Group:Client Infrastructure" {
                color #78909c
                stroke #78909c
            }

            element "Group:API Layer" {
                color #ab47bc
                stroke #ab47bc
            }
            element "Group:Middleware" {
                color #66bb6a
                stroke #66bb6a
            }
            element "Group:Infrastructure Layer" {
                color #8d6e63
                stroke #8d6e63
            }
        }
    }
}
