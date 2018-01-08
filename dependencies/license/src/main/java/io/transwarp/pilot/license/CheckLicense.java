package io.transwarp.pilot.license;

import dnw.srvlic.info.v2.CompLicInfoV2;

/**
 * Created by jiajie on 17-5-11.
 */
public class CheckLicense {
    public boolean checkLicense(String licenseServerLoc){
        try {
            PilotLicensor licensor = new PilotLicensor(licenseServerLoc, CompLicInfoV2.CompTypeV2.PILOT, new PilotZnodeWatcher());
            licensor.setupLicense();
            PilotLicense license = PilotLicense.getInstance();
            if (!license.isAvailableOf(PilotFeature.PILOT)) {
                throw new RuntimeException("Pilot is not available under current licence");
            }
        } catch (Exception e) {
            throw new RuntimeException("License check failed");
        }
        return true;
    }
}
