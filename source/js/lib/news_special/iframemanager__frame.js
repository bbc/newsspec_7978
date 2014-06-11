define(['jquery'], function ($) {
    var hostCommunicator = {
        iFrameIndex: false,
        postMessageAvailable: (window.postMessage ? true : false),
        init: function () {
            this.setHeight();
            this.startWatching();
            if (this.postMessageAvailable) {
                this.setupPostMessage();
            }
            else {
                this.setupIframeBridge();
            }

            this.subscribeToEvents();

            this.sendDataToHost({
                iFrameReady: true
            });
        },
        subscribeToEvents: function () {
            var externalHostCommunicator = this;

            $.on('istats', function (actionType, actionName, viewLabel) {
                externalHostCommunicator.setHeight();
                externalHostCommunicator.registerIstatsCall(actionType, actionName, viewLabel);
            });

            $.on('event_to_send_to_host', function (announcement, details) {
                externalHostCommunicator.sendDataToHost({
                    pubsub: {
                        originator:   externalHostCommunicator.iFrameIndex,
                        announcement: announcement,
                        details:      details
                    }
                });
            });
        },
        sendDataToHost: function (data) {
            if (this.postMessageAvailable) {
                this.sendDataByPostMessage(data);
            } else {
                this.sendDataByIframeBridge(data);
            }
        },
        setIFrameIndex: function (event) {
            var data = JSON.parse(event.data.split('::')[1]);

            if (data.announcement === 'setting_index_from_host') {
                hostCommunicator.iFrameIndex = data.details[0];
                // only need to set the iframe index once
                window.removeEventListener('message', hostCommunicator.setIFrameIndex, false);
            }
        },
        height: 0,
        registerIstatsCall: function (actionType, actionName, viewLabel) {
            var istatsData = {
                'actionType': actionType,
                'actionName': actionName,
                'viewLabel':  viewLabel
            };
            if (this.postMessageAvailable) {
                this.sendDataByPostMessage(istatsData);
            }
            else {
                window.istatsQueue.push(istatsData);
            }
        },
        setupPostMessage: function () {
            window.setInterval(this.sendDataByPostMessage, 32);
            window.addEventListener('message', this.setIFrameIndex, false);
        },
        setupIframeBridge: function () {
            window.setInterval(this.sendDataByIframeBridge, 100);
            window.istatsQueue = [];
            // @TODO - listen for iframe index via iframe bridge
        },
        sendDataByPostMessage: function (message) {
            var talker_uid = window.location.pathname;
            message = hostCommunicator.constructMessage(message);
            window.parent.postMessage(talker_uid + '::' + JSON.stringify(message), '*');
        },
        sendDataByIframeBridge: function (message) {
            window.iframeBridge = this.constructMessage(message);
        },
        constructMessage: function (additionalMessage) {
            var message = {
                height:           hostCommunicator.height,
                hostPageCallback: hostCommunicator.hostPageCallback
            };
            $.extend(message, additionalMessage || {});
            return message;
        },
        startWatching: function () {
            window.setInterval(this.setHeight, 32);
        },
        staticHeight: null,
        setStaticHeight: function (newStaticHeight) {
            this.staticHeight = newStaticHeight;
        },
        setHeight: function () {
            var heightValues = [this.staticHeight || 0];
            if ($('.main').length > 0) {
                heightValues.push($('.main')[0].scrollHeight);
            }
            hostCommunicator.height = Math.max.apply(Math, heightValues);
        },
        hostPageCallback: false,
        setHostPageInitialization: function (callback) {
            hostCommunicator.hostPageCallback = callback.toString();
        }
    };
    return hostCommunicator;
});