import EmailClient from '../clients/EmailClient/EmailClient';
import { lightdashConfig } from '../config/lightdashConfig';
import {
    personalAccessTokenModel,
    dashboardModel,
    emailModel,
    inviteLinkModel,
    onboardingModel,
    openIdIdentityModel,
    organizationMemberProfileModel,
    organizationModel,
    passwordResetLinkModel,
    projectModel,
    sessionModel,
    userModel,
} from '../models/models';
import { SavedQueriesModel } from '../models/savedQueries';
import { DashboardService } from './DashboardService/DashboardService';
import { HealthService } from './HealthService/HealthService';
import { OrganizationService } from './OrganizationService/OrganizationService';
import { ProjectService } from './ProjectService/ProjectService';
import { SavedChartsService } from './SavedChartsService/SavedChartsService';
import { UserService } from './UserService';
import { PersonalAccessTokenService } from './PersonalAccessTokenService';

const emailClient = new EmailClient({ lightdashConfig });

export const userService = new UserService({
    inviteLinkModel,
    userModel,
    sessionModel,
    emailModel,
    openIdIdentityModel,
    passwordResetLinkModel,
    emailClient,
    organizationMemberProfileModel,
    organizationModel,
    personalAccessTokenModel,
});
export const organizationService = new OrganizationService({
    organizationModel,
    projectModel,
    onboardingModel,
    inviteLinkModel,
    organizationMemberProfileModel,
});

export const projectService = new ProjectService({
    projectModel,
    onboardingModel,
    savedChartModel: SavedQueriesModel,
});

export const healthService = new HealthService({
    userModel,
    projectModel,
    lightdashConfig,
});

export const dashboardService = new DashboardService({
    dashboardModel,
});

export const savedChartsService = new SavedChartsService({
    projectModel,
});

export const personalAccessTokenService = new PersonalAccessTokenService({
    personalAccessTokenModel,
});
