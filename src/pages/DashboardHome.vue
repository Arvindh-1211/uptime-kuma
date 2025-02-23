<template>
    <transition ref="tableContainer" name="slide-fade" appear>
        <div v-if="$route.name === 'DashboardHome'">
            <div class="d-flex justify-content-between">
                <h1 class="mb-3">
                    {{ $t("Quick Stats") }}
                </h1>
                <div>
                    <button @click="openModal" class="rounded-pill p-2 px-3 btn-primary border-0">
                        <font-awesome-icon icon="download" />
                        Get Downtime Stats
                    </button>
                </div>
            </div>

            <Modal :visible="isModalVisible" @close="isModalVisible = false" title="Downtime Stats">
                <form @submit.prevent="requestDowntimeStats">
                    <div class="mb-3">
                        <label for="fromDate" class="form-label">From:</label>
                        <input type="datetime-local" id="fromDate" v-model="fromDate" class="form-control" required>
                    </div>
                    <div class="mb-3">
                        <label for="toDate">To:</label>
                        <input type="datetime-local" id="toDate" v-model="toDate" class="form-control" required>
                    </div>
                    <div class="d-flex flex-row-reverse">
                        <button type="submit" class="btn btn-primary">Generate</button>
                    </div>
                </form>
            </Modal>

            <div class="shadow-box big-padding text-center mb-4">
                <div class="row">
                    <div class="col">
                        <h3>{{ $t("Up") }}</h3>
                        <span class="num">{{ $root.stats.up }}</span>
                    </div>
                    <div class="col">
                        <h3>{{ $t("Down") }}</h3>
                        <span class="num text-danger">{{ $root.stats.down }}</span>
                    </div>
                    <div class="col">
                        <h3>{{ $t("Maintenance") }}</h3>
                        <span class="num text-maintenance">{{ $root.stats.maintenance }}</span>
                    </div>
                    <div class="col">
                        <h3>{{ $t("Unknown") }}</h3>
                        <span class="num text-secondary">{{ $root.stats.unknown }}</span>
                    </div>
                    <div class="col">
                        <h3>{{ $t("pauseDashboardHome") }}</h3>
                        <span class="num text-secondary">{{ $root.stats.pause }}</span>
                    </div>
                </div>
            </div>

            <div class="shadow-box table-shadow-box" style="overflow-x: hidden;">
                <table class="table table-borderless table-hover">
                    <thead>
                        <tr>
                            <th>{{ $t("Name") }}</th>
                            <th>{{ $t("Status") }}</th>
                            <th>{{ $t("DateTime") }}</th>
                            <th>{{ $t("Message") }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(beat, index) in displayedRecords" :key="index"
                            :class="{ 'shadow-box': $root.windowWidth <= 550 }">
                            <td><router-link :to="`/dashboard/${beat.monitorID}`">{{ beat.name }}</router-link></td>
                            <td>
                                <Status :status="beat.status" />
                            </td>
                            <td :class="{ 'border-0': !beat.msg }">
                                <Datetime :value="beat.time" />
                            </td>
                            <td class="border-0">{{ beat.msg }}</td>
                        </tr>

                        <tr v-if="importantHeartBeatList.length === 0">
                            <td colspan="4">
                                {{ $t("No important events") }}
                            </td>
                        </tr>
                    </tbody>
                </table>

                <div class="d-flex justify-content-center kuma_pagination">
                    <pagination v-model="page" :records="importantHeartBeatList.length" :per-page="perPage"
                        :options="paginationConfig" />
                </div>
            </div>
        </div>
    </transition>
    <router-view ref="child" />
</template>

<script>
import Status from "../components/Status.vue";
import Datetime from "../components/Datetime.vue";
import Pagination from "v-pagination-3";
import Modal from "../components/Modal.vue";

export default {
    components: {
        Datetime,
        Status,
        Pagination,
        Modal,
    },
    props: {
        calculatedHeight: {
            type: Number,
            default: 0
        }
    },
    data() {
        return {
            page: 1,
            perPage: 25,
            initialPerPage: 25,
            heartBeatList: [],
            paginationConfig: {
                hideCount: true,
                chunksNavigation: "scroll",
            },
            isModalVisible: false,
            fromDate: '',
            toDate: '',
        };
    },
    computed: {

        importantHeartBeatList() {
            let result = [];

            for (let monitorID in this.$root.importantHeartbeatList) {
                let list = this.$root.importantHeartbeatList[monitorID];
                result = result.concat(list);
            }

            for (let beat of result) {
                let monitor = this.$root.monitorList[beat.monitorID];

                if (monitor) {
                    beat.name = monitor.name;
                }
            }

            result.sort((a, b) => {
                if (a.time > b.time) {
                    return -1;
                }

                if (a.time < b.time) {
                    return 1;
                }

                return 0;
            });

            // eslint-disable-next-line vue/no-side-effects-in-computed-properties
            this.heartBeatList = result;

            return result;
        },

        displayedRecords() {
            const startIndex = this.perPage * (this.page - 1);
            const endIndex = startIndex + this.perPage;
            return this.heartBeatList.slice(startIndex, endIndex);
        },
    },
    watch: {
        importantHeartBeatList() {
            this.$nextTick(() => {
                this.updatePerPage();
            });
        },
    },
    mounted() {
        this.initialPerPage = this.perPage;

        window.addEventListener("resize", this.updatePerPage);
        this.updatePerPage();

    },
    beforeUnmount() {
        window.removeEventListener("resize", this.updatePerPage);
    },
    methods: {
        updatePerPage() {
            const tableContainer = this.$refs.tableContainer;
            const tableContainerHeight = tableContainer.offsetHeight;
            const availableHeight = window.innerHeight - tableContainerHeight;
            const additionalPerPage = Math.floor(availableHeight / 58);

            if (additionalPerPage > 0) {
                this.perPage = Math.max(this.initialPerPage, this.perPage + additionalPerPage);
            } else {
                this.perPage = this.initialPerPage;
            }

        },
        openModal() {
            this.isModalVisible = true;
            console.log("Modal opened"); // Debugging line
        },
        requestDowntimeStats() {
            console.log("Message sent");
            const startTime = '2025-02-22 00:00:00';
            const endTime = '2025-02-23 00:00:00';
            this.$root.getSocket().emit('requestDownTimeStats', this.fromDate, this.toDate, (response) => {
                if (response.ok) {
                    console.log({ ...response.data.downtimeStats });
                    console.log({ ...response.data.totalDowntime });

                    // const XLSX = require('xlsx');
                    // const worksheet1 = XLSX.utils.json_to_sheet({ ...response.data.downtimeStats });
                    // const worksheet2 = XLSX.utils.json_to_sheet({ ...response.data.totalDowntime });
                    // const workbook = XLSX.utils.book_new();
                    // XLSX.utils.book_append_sheet(workbook, worksheet1, "Downtime Stats");
                    // XLSX.utils.book_append_sheet(workbook, worksheet2, "Downtime Stats");
                    // XLSX.writeFile(workbook, "downtime-stats.xlsx");
                    // console.log("File generated");
                } else {
                    console.error('Error receiving downtime stats:', response.msg);
                }
            })
            this.isModalVisible = false;
        },
    },
};
</script>

<style lang="scss" scoped>
@import "../assets/vars";

.num {
    font-size: 30px;
    color: $primary;
    font-weight: bold;
    display: block;
}

.shadow-box {
    padding: 20px;
}

table {
    font-size: 14px;

    tr {
        transition: all ease-in-out 0.2ms;
    }

    @media (max-width: 550px) {
        table-layout: fixed;
        overflow-wrap: break-word;
    }
}
#fromDate::-webkit-calendar-picker-indicator,
#toDate::-webkit-calendar-picker-indicator {
    filter: invert(76%) sepia(9%) saturate(91%) hue-rotate(176deg) brightness(95%) contrast(90%);
    cursor: pointer;
}
</style>