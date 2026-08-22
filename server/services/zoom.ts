import axios, { AxiosInstance } from 'axios';

interface ZoomConfig {
  accountId: string;
  clientId: string;
  clientSecret: string;
}

interface ZoomMeetingSettings {
  host_video: boolean;
  participant_video: boolean;
  join_before_host: boolean;
  mute_upon_entry: boolean;
  watermark: boolean;
  use_pmi: boolean;
  approval_type: number;
  registration_type: number;
  audio: string;
  auto_recording: string;
  waiting_room: boolean;
  meeting_authentication: boolean;
}

interface CreateMeetingParams {
  topic: string;
  type: number;
  start_time: string;
  duration: number;
  timezone?: string;
  password?: string;
  agenda?: string;
  settings?: Partial<ZoomMeetingSettings>;
}

export interface ZoomMeeting {
  id: string;
  uuid: string;
  host_id: string;
  topic: string;
  type: number;
  start_time: string;
  duration: number;
  timezone: string;
  created_at: string;
  join_url: string;
  start_url: string;
  password?: string;
  h323_password?: string;
  pstn_password?: string;
  encrypted_password?: string;
  settings: ZoomMeetingSettings;
}

interface ZoomRecording {
  uuid: string;
  id: string;
  account_id: string;
  host_id: string;
  topic: string;
  start_time: string;
  duration: number;
  total_size: number;
  recording_count: number;
  share_url?: string;
  recording_files: Array<{
    id: string;
    recording_start: string;
    recording_end: string;
    file_type: string;
    file_size: number;
    play_url?: string;
    download_url?: string;
    status: string;
  }>;
}

export class ZoomService {
  private config: ZoomConfig;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private client: AxiosInstance;

  constructor(config: ZoomConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: 'https://api.zoom.us/v2',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use(async (config) => {
      await this.ensureValidToken();
      config.headers.Authorization = `Bearer ${this.accessToken}`;
      return config;
    });
  }

  private async ensureValidToken(): Promise<void> {
    const now = Date.now();
    
    if (this.accessToken && this.tokenExpiry > now + 5 * 60 * 1000) {
      return;
    }

    await this.refreshAccessToken();
  }

  private async refreshAccessToken(): Promise<void> {
    try {
      const credentials = Buffer.from(
        `${this.config.clientId}:${this.config.clientSecret}`
      ).toString('base64');

      const response = await axios.post(
        `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${this.config.accountId}`,
        null,
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + response.data.expires_in * 1000;
    } catch (error) {
      console.error('Failed to refresh Zoom access token:', error);
      throw new Error('Failed to authenticate with Zoom API');
    }
  }

  async createMeeting(userId: string, params: CreateMeetingParams): Promise<ZoomMeeting> {
    try {
      const defaultSettings: Partial<ZoomMeetingSettings> = {
        host_video: true,
        participant_video: true,
        join_before_host: false,
        mute_upon_entry: true,
        watermark: false,
        approval_type: 0,
        audio: 'both',
        auto_recording: 'cloud',
        waiting_room: true,
        meeting_authentication: false,
      };

      const meetingData = {
        ...params,
        settings: {
          ...defaultSettings,
          ...params.settings,
        },
      };

      const response = await this.client.post(`/users/me/meetings`, meetingData);
      return response.data;
    } catch (error: any) {
      console.error('Failed to create Zoom meeting:', error.response?.data || error.message);
      throw new Error('Failed to create Zoom meeting');
    }
  }

  async getMeeting(meetingId: string): Promise<ZoomMeeting> {
    try {
      const response = await this.client.get(`/meetings/${meetingId}`);
      return response.data;
    } catch (error: any) {
      console.error('Failed to get Zoom meeting:', error.response?.data || error.message);
      throw new Error('Failed to get Zoom meeting');
    }
  }

  async updateMeeting(meetingId: string, params: Partial<CreateMeetingParams>): Promise<void> {
    try {
      await this.client.patch(`/meetings/${meetingId}`, params);
    } catch (error: any) {
      console.error('Failed to update Zoom meeting:', error.response?.data || error.message);
      throw new Error('Failed to update Zoom meeting');
    }
  }

  async deleteMeeting(meetingId: string, notifyParticipants: boolean = true): Promise<void> {
    try {
      await this.client.delete(`/meetings/${meetingId}`, {
        params: {
          schedule_for_reminder: notifyParticipants,
        },
      });
    } catch (error: any) {
      console.error('Failed to delete Zoom meeting:', error.response?.data || error.message);
      throw new Error('Failed to delete Zoom meeting');
    }
  }

  async getMeetingRecordings(meetingId: string): Promise<ZoomRecording> {
    try {
      const response = await this.client.get(`/meetings/${meetingId}/recordings`);
      return response.data;
    } catch (error: any) {
      console.error('Failed to get Zoom recordings:', error.response?.data || error.message);
      throw new Error('Failed to get Zoom recordings');
    }
  }

  async getMeetingParticipants(meetingId: string): Promise<any[]> {
    try {
      const response = await this.client.get(`/past_meetings/${meetingId}/participants`);
      return response.data.participants || [];
    } catch (error: any) {
      console.error('Failed to get Zoom participants:', error.response?.data || error.message);
      return [];
    }
  }

  async endMeeting(meetingId: string): Promise<void> {
    try {
      await this.client.put(`/meetings/${meetingId}/status`, {
        action: 'end',
      });
    } catch (error: any) {
      console.error('Failed to end Zoom meeting:', error.response?.data || error.message);
      throw new Error('Failed to end Zoom meeting');
    }
  }

  async getUserProfile(userId: string = 'me'): Promise<any> {
    try {
      const response = await this.client.get(`/users/${userId}`);
      return response.data;
    } catch (error: any) {
      console.error('Failed to get Zoom user profile:', error.response?.data || error.message);
      throw new Error('Failed to get Zoom user profile');
    }
  }
}

let zoomService: ZoomService | null = null;

export function initializeZoomService(): ZoomService | null {
  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;

  if (!accountId || !clientId || !clientSecret) {
    console.warn('Zoom credentials not configured.');
    return null;
  }

  if (!zoomService) {
    zoomService = new ZoomService({
      accountId,
      clientId,
      clientSecret,
    });
  }

  return zoomService;
}

export function getZoomService(): ZoomService | null {
  if (!zoomService) {
    return initializeZoomService();
  }
  return zoomService;
}
