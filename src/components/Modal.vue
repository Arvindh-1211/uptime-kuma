<template>
    <div class="modal-overlay" v-if="visible">
        <div class="form-detail">
            <div class="modal-header">
                <h3>{{ title }}</h3>
                <button @click="close" class="close-icon">
                    <font-awesome-icon icon="times" />
                </button>
            </div>
            <div class="modal-body">
                <slot></slot>
            </div>
            <!-- <div class="modal-footer">
                <button @click="close" class="close-button">Close</button>
            </div> -->
        </div>
    </div>
</template>

<script>
export default {
    props: {
        title: {
            type: String,
            default: 'Modal Title'
        },
        visible: {
            type: Boolean,
            default: false
        }
    },
    methods: {
        close() {
            this.$emit('close');
        }
    }
};
</script>

<style scoped>
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(2px);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.form-detail {
    position: absolute;
    top: 20%;
    background: #0d1117;
    /* background-color: white; */
    padding: 20px;
    border-radius: 16px;
    width: 500px;
    max-width: 100%;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    z-index: 1000;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #b1b8c0;
    border-color: #b1b8c0;
    z-index: 1000;
}

.close-icon {
    background: none;
    border: none;
    color: #b1b8c0;
    font-size: 1.2em;
    cursor: pointer;
}

.close-button {
    background-color: #dc3545;
    border: 0px;
    border-radius: 20px;
    padding: 6px 18px;
}

.modal-body {
    margin-top: 10px;
    margin-bottom: 10px;
}

.modal-footer {
    display: flex;
    justify-content: flex-start;
    border: 0px;
}

form {
    display: flex;
    flex-direction: column;
}

form div {
    margin-bottom: 10px;
}

form label {
    margin-bottom: 5px;
}

form input {
    padding: 5px;
    font-size: 1em;
}

form button {
    padding: 10px;
    font-size: 1em;
    cursor: pointer;
}
</style>