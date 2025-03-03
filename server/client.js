/*
 * For Client Socket
 */
const { TimeLogger, log } = require("../src/util");
const { R } = require("redbean-node");
const { UptimeKumaServer } = require("./uptime-kuma-server");
const server = UptimeKumaServer.getInstance();
const io = server.io;
const { setting } = require("./util-server");
const checkVersion = require("./check-version");

/**
 * Send list of notification providers to client
 * @param {Socket} socket Socket.io socket instance
 * @returns {Promise<Bean[]>}
 */
async function sendNotificationList(socket) {
    const timeLogger = new TimeLogger();

    let result = [];
    let list = await R.find("notification", " user_id = ? ", [
        socket.userID,
    ]);

    for (let bean of list) {
        let notificationObject = bean.export();
        notificationObject.isDefault = (notificationObject.isDefault === 1);
        notificationObject.active = (notificationObject.active === 1);
        result.push(notificationObject);
    }

    io.to(socket.userID).emit("notificationList", result);

    timeLogger.print("Send Notification List");

    return list;
}

/**
 * Send Heartbeat History list to socket
 * @param {Socket} socket Socket.io instance
 * @param {number} monitorID ID of monitor to send heartbeat history
 * @param {boolean} [toUser=false]  True = send to all browsers with the same user id, False = send to the current browser only
 * @param {boolean} [overwrite=false] Overwrite client-side's heartbeat list
 * @returns {Promise<void>}
 */

async function sendDowntimeStats(socket, startTime, endTime) {

    let downtimeStats = [];
    let totalDowntimeStats = [];
    
    const formatTime = (time) => {
        let hours = String(Math.floor(time / 3600)).padStart(2, '0');
        let minutes = String(Math.floor((time % 3600) / 60)).padStart(2, '0');
        let seconds = String(Math.floor(time % 60)).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    }

    const monitorList = await R.getAll(`
        SELECT id, name, url FROM monitor
    `);

    await Promise.all(monitorList.map(async (monitor) => {
        const heartbeats = await R.getAll(`
            SELECT * FROM heartbeat
            WHERE monitor_id = ?
            AND time >= datetime(?) AND time <= datetime(?)
            ORDER BY time ASC
            `,[
            monitor.id,
            startTime,
            endTime
        ]);

        let isDown = false;
        let downTime = null;
        let totalDowntime = 0;

        heartbeats.forEach(beat => {
            
            if (beat.status === 0 && !isDown) {
                isDown = true;
                downTime = beat.time;
            }
            if (isDown && beat.status === 1) {
                isDown = false;
                let upTime = beat.time;
                let timeDifferenceSec = (new Date(upTime) - new Date(downTime)) / 1000;
                let timeDifference = formatTime(timeDifferenceSec);
                totalDowntime += timeDifferenceSec;
                
                downtimeStats.push({
                    monitor_id: monitor.id,
                    monitor_name: monitor.name,
                    monitor_url: monitor.url,
                    downTime: downTime,
                    upTime: upTime,
                    duration: timeDifference
                });

                downTime = null;
            }
        });

        if(isDown){
            let timeDifferenceSec = (new Date(endTime) - new Date(downTime)) / 1000;
            let timeDifference = formatTime(timeDifferenceSec);
            totalDowntime += timeDifferenceSec;
            downtimeStats.push({
                monitor_id: monitor.id,
                monitor_name: monitor.name,
                monitor_url: monitor.url,
                downTime: downTime,
                upTime: endTime,
                duration: timeDifference
            });
        }


        let timeDifference = formatTime(totalDowntime);
        totalDowntimeStats.push({
            monitor_id: monitor.id,
            monitor_name: monitor.name,
            monitor_url: monitor.url,
            downTime: timeDifference
        });
    }));

    socket.emit("sendDownTimeStats", {downtimeStats: downtimeStats, totalDowntime: totalDowntimeStats});
}


async function sendHeartbeatList(socket, monitorID, toUser = false, overwrite = false) {    
    const timeLogger = new TimeLogger();

    let list = await R.getAll(`
        SELECT * FROM heartbeat
        WHERE monitor_id = ?
        ORDER BY time DESC
        LIMIT 100
    `, [
        monitorID,
    ]);

    let result = list.reverse();

    if (toUser) {
        io.to(socket.userID).emit("heartbeatList", monitorID, result, overwrite);
    } else {
        socket.emit("heartbeatList", monitorID, result, overwrite);
    }

    timeLogger.print(`[Monitor: ${monitorID}] sendHeartbeatList`);
}

/**
 * Important Heart beat list (aka event list)
 * @param {Socket} socket Socket.io instance
 * @param {number} monitorID ID of monitor to send heartbeat history
 * @param {boolean} [toUser=false]  True = send to all browsers with the same user id, False = send to the current browser only
 * @param {boolean} [overwrite=false] Overwrite client-side's heartbeat list
 * @returns {Promise<void>}
 */
async function sendImportantHeartbeatList(socket, monitorID, toUser = false, overwrite = false) {
    const timeLogger = new TimeLogger();

    let list = await R.find("heartbeat", `
        monitor_id = ?
        AND important = 1
        ORDER BY time DESC
        LIMIT 500
    `, [
        monitorID,
    ]);

    timeLogger.print(`[Monitor: ${monitorID}] sendImportantHeartbeatList`);

    if (toUser) {
        io.to(socket.userID).emit("importantHeartbeatList", monitorID, list, overwrite);
    } else {
        socket.emit("importantHeartbeatList", monitorID, list, overwrite);
    }

}

/**
 * Emit proxy list to client
 * @param {Socket} socket Socket.io socket instance
 * @return {Promise<Bean[]>}
 */
async function sendProxyList(socket) {
    const timeLogger = new TimeLogger();

    const list = await R.find("proxy", " user_id = ? ", [ socket.userID ]);
    io.to(socket.userID).emit("proxyList", list.map(bean => bean.export()));

    timeLogger.print("Send Proxy List");

    return list;
}

/**
 * Emit API key list to client
 * @param {Socket} socket Socket.io socket instance
 * @returns {Promise<void>}
 */
async function sendAPIKeyList(socket) {
    const timeLogger = new TimeLogger();

    let result = [];
    const list = await R.find(
        "api_key",
        "user_id=?",
        [ socket.userID ],
    );

    for (let bean of list) {
        result.push(bean.toPublicJSON());
    }

    io.to(socket.userID).emit("apiKeyList", result);
    timeLogger.print("Sent API Key List");

    return list;
}

/**
 * Emits the version information to the client.
 * @param {Socket} socket Socket.io socket instance
 * @param {boolean} hideVersion
 * @returns {Promise<void>}
 */
async function sendInfo(socket, hideVersion = false) {
    let version;
    let latestVersion;
    let isContainer;

    if (!hideVersion) {
        version = checkVersion.version;
        latestVersion = checkVersion.latestVersion;
        isContainer = (process.env.UPTIME_KUMA_IS_CONTAINER === "1");
    }

    socket.emit("info", {
        version,
        latestVersion,
        isContainer,
        primaryBaseURL: await setting("primaryBaseURL"),
        serverTimezone: await server.getTimezone(),
        serverTimezoneOffset: server.getTimezoneOffset(),
    });
}

/**
 * Send list of docker hosts to client
 * @param {Socket} socket Socket.io socket instance
 * @returns {Promise<Bean[]>}
 */
async function sendDockerHostList(socket) {
    const timeLogger = new TimeLogger();

    let result = [];
    let list = await R.find("docker_host", " user_id = ? ", [
        socket.userID,
    ]);

    for (let bean of list) {
        result.push(bean.toJSON());
    }

    io.to(socket.userID).emit("dockerHostList", result);

    timeLogger.print("Send Docker Host List");

    return list;
}

module.exports = {
    sendDowntimeStats,
    sendNotificationList,
    sendImportantHeartbeatList,
    sendHeartbeatList,
    sendProxyList,
    sendAPIKeyList,
    sendInfo,
    sendDockerHostList
};
