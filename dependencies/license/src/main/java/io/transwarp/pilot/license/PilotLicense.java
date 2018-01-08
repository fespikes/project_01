package io.transwarp.pilot.license;

import dnw.srvlic.info.v2.CompLicInfoV2;
import io.transwarp.msl.CommonLicense;

/**
 * Created by jiajie on 17-5-11.
 */

public class PilotLicense extends CommonLicense<PilotFeature> {
    private static PilotLicense instance;

    PilotLicense(CompLicInfoV2 compLic) {
        super(compLic);
    }

    public static PilotLicense getInstance() {
        if (instance == null) {
            throw new RuntimeException("LICENSE NOT INITIALIZED");
        }
        return instance;
    }

    public static void createinstance(CompLicInfoV2 license) {
        instance = new PilotLicense((license));
    }
}
