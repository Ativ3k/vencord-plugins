/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { sendBotMessage } from '@api/Commands';
import { Settings } from '@api/Settings';
import definePlugin, { OptionType, PluginOptionsItem } from '@utils/types';
import { SelectedChannelStore, UserStore } from '@webpack/common';

interface VoiceState {
	userId: string;
	channelId?: string;
	oldChannelId?: string;
	deaf: boolean;
	mute: boolean;
	selfDeaf: boolean;
	selfMute: boolean;
}

let myLastChannelId: string | undefined;

const sendLog = (text: string) => {
	if (!text || !myLastChannelId) return;
	sendBotMessage(myLastChannelId, { content: text });
};

const getTypeAndChannelId = (
	{ channelId, oldChannelId }: VoiceState,
	isLocalUser: boolean
) => {
	if (isLocalUser && channelId !== myLastChannelId) {
		oldChannelId = myLastChannelId;
		myLastChannelId = channelId;
	}

	if (channelId !== oldChannelId) {
		if (channelId) return [oldChannelId ? 'move' : 'join', channelId];
		if (oldChannelId) return ['leave', oldChannelId];
	}

	return ['', ''];
};

const formatText = (str: string, userId: string, channelId: string) => {
	return str
		.replaceAll('$USER', userId ? `<@${userId}>` : 'unknown user')
		.replaceAll('$CHANNEL', channelId ? `<#${channelId}>` : 'unknown channel');
};

export default definePlugin({
	name: 'Voice Logs',
	description:
		'Announces when users join, leave, or move voice channels via text messages.',
	authors: [{ name: 'Ativ', id: 258891606873210880n }],

	flux: {
		VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: VoiceState[] }) {
			const myChannelId = SelectedChannelStore.getVoiceChannelId();
			const localUserId = UserStore.getCurrentUser().id;

			for (const state of voiceStates) {
				const { userId, channelId, oldChannelId } = state;
				const isLocalUser = userId === localUserId;
				if (!isLocalUser) {
					if (
						!myChannelId ||
						(channelId !== myChannelId && oldChannelId !== myChannelId)
					)
						continue;
				}

				const [type, id] = getTypeAndChannelId(state, isLocalUser);
				if (!type) continue;

				const feedbackString =
					Settings.plugins.VoiceStateUpdate[type + 'Message'];
				sendLog(formatText(feedbackString, userId, id));
			}
		},
	},

	start() {},

	optionsCache: null as Record<string, PluginOptionsItem> | null,

	get options() {
		return (this.optionsCache ??= {
			moveMessage: {
				type: OptionType.STRING,
				description: 'Move Message',
				default: '$USER moved to $CHANNEL',
			},
			joinMessage: {
				type: OptionType.STRING,
				description: 'Join Message',
				default: '$USER joined',
			},
			leaveMessage: {
				type: OptionType.STRING,
				description: 'Leave Message',
				default: '$USER left',
			},
		});
	},
});
