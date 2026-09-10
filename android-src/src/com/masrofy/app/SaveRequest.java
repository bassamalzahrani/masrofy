package com.masrofy.app;

final class SaveRequest implements Runnable {
    private final MainActivity activity;
    SaveRequest(MainActivity activity) { this.activity = activity; }
    @Override public void run() { activity.launchSavePicker(); }
}
