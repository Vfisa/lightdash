import React from 'react';
import Explorer from '../components/Explorer';
import ExploreSideBar from '../components/Explorer/ExploreSideBar/index';
import {
    useExplorerRoute,
    useExplorerUrlState,
} from '../hooks/useExplorerRoute';
import useSidebarResize from '../hooks/useSidebarResize';
import { ExplorerProvider } from '../providers/ExplorerProvider';
import {
    Main,
    PageContainer,
    Resizer,
    SideBar,
    SideBarCard,
} from './Explorer.styles';

const ExplorerWithUrlParams = () => {
    useExplorerRoute();
    return <Explorer />;
};

const ExplorerPage = () => {
    const explorerUrlState = useExplorerUrlState();
    const { sidebarRef, sidebarWidth, isResizing, startResizing } =
        useSidebarResize({
            defaultWidth: 400,
            minWidth: 300,
            maxWidth: 600,
        });
    return (
        <ExplorerProvider isEditMode={true} initialState={explorerUrlState}>
            <PageContainer>
                <SideBar ref={sidebarRef}>
                    <SideBarCard
                        elevation={1}
                        style={{
                            width: sidebarWidth,
                        }}
                    >
                        <ExploreSideBar />
                    </SideBarCard>
                    <Resizer
                        onMouseDown={startResizing}
                        $isResizing={isResizing}
                    />
                </SideBar>
                <Main>
                    <ExplorerWithUrlParams />
                </Main>
            </PageContainer>
        </ExplorerProvider>
    );
};

export default ExplorerPage;
