



export function renderProfileSection(profile: any) {
     return `
        <h2 class="text-2xl font-bold mb-6 text-center">Lichess Profile</h2>
        <div class="space-y-4 mb-8">
            <div>
                <span class="font-semibold">Username:</span>
                <a href="${profile.data.url}" target="_blank" class="text-blue-600 underline">${profile.data.username}</a>
            </div>
            <div>
                <span class="font-semibold">Created At:</span>
                ${profile.data.createdAt ? new Date(profile.data.createdAt).toLocaleDateString() : 'N/A'}
            </div>
            <div>
                <table class="min-w-full divide-y divide-gray-200 table-fixed">
                    <thead>
                        <tr class="bg-gray-100">
                            <th colspan="4" class="px-4 py-2 text-center text-sm font-bold text-gray-700 uppercase border-b">Ratings</th>
                        </tr>
                        <tr>
                            <th class="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Bullet</th>
                            <th class="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Blitz</th>
                            <th class="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Rapid</th>
                            <th class="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Classical</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="font-semibold text-center">${profile.data.perfs?.bullet?.rating ?? 'N/A'}</td>
                            <td class="font-semibold text-center">${profile.data.perfs?.blitz?.rating ?? 'N/A'}</td>
                            <td class="font-semibold text-center">${profile.data.perfs?.rapid?.rating ?? 'N/A'}</td>
                            <td class="font-semibold text-center">${profile.data.perfs?.classical?.rating ?? 'N/A'}</td>
                        </tr>
                        <tr class="bg-gray-100">
                            <th colspan="4" class="px-4 py-2 text-center text-sm font-bold text-gray-700 uppercase border-b">Stats</th>
                        </tr>
                        <tr>
                            <td class="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Matches</td>
                            <td class="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Wins</td>
                            <td class="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Loses</td>
                            <td class="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Draws</td>
                        </tr>
                        <tr>
                            <td class="font-semibold text-center">${profile.data.count?.all ?? 'N/A'}</td>
                            <td class="font-semibold text-center">${profile.data.count?.win ?? 'N/A'}</td>
                            <td class="font-semibold text-center">${profile.data.count?.loss ?? 'N/A'}</td>
                            <td class="font-semibold text-center">${profile.data.count?.draw ?? 'N/A'}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>`
}