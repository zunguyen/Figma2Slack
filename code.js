// code.js - runs in Figma sandbox

figma.showUI(__html__, { width: 420, height: 520, title: 'Figma2Slack' });

function getNodeLink(nodeId) {
	const fileKey = figma.fileKey;
	console.log('[Figma2Slack] figma.fileKey =', fileKey);
	if (!fileKey) return null;
	// Figma node IDs look like "1:2" — encode colon as dash for the URL query param
	const cleanId = nodeId.replace(/:/g, '-');
	return `https://www.figma.com/design/${fileKey}?node-id=${cleanId}`;
}

function getContext() {
	const selection = figma.currentPage.selection;
	const currentPage = figma.currentPage;
	const fileKey = figma.fileKey || null;

	if (selection.length === 0) {
		const pageLink = getNodeLink(currentPage.id);
		return {
			type: 'page',
			name: currentPage.name,
			nodeId: null,
			pageId: currentPage.id,
			link: pageLink,
			fileKey,
		};
	}

	const node = selection[0];
	const link = getNodeLink(node.id);
	console.log('[Figma2Slack] fileKey =', fileKey, '| node.id =', node.id, '| link =', link);
	return {
		type: 'frame',
		name: node.name,
		nodeId: node.id,
		pageId: currentPage.id,
		link,
		fileKey,
	};
}

figma.ui.postMessage({ type: 'context', context: getContext() });

figma.on('selectionchange', () => {
	figma.ui.postMessage({ type: 'context', context: getContext() });
});

figma.ui.onmessage = async msg => {
	if (msg.type === 'save-webhook') {
		await figma.clientStorage.setAsync('webhookUrl', msg.url);
		figma.ui.postMessage({ type: 'webhook-saved' });
	}

	if (msg.type === 'load-webhook') {
		const url = await figma.clientStorage.getAsync('webhookUrl');
		figma.ui.postMessage({ type: 'webhook-loaded', url: url || '' });
	}

	if (msg.type === 'send-announcement') {
		const webhookUrl = await figma.clientStorage.getAsync('webhookUrl');
		if (!webhookUrl) {
			figma.ui.postMessage({ type: 'error', message: 'No Slack webhook URL saved.' });
			return;
		}

		// The Figma sandbox (code.js) cannot call fetch — only the UI iframe can.
		// Relay the webhookUrl + payload back to ui.html to perform the actual request.
		figma.ui.postMessage({ type: 'do-fetch', webhookUrl, payload: msg.payload });
	}

	if (msg.type === 'close') {
		figma.closePlugin();
	}
};
